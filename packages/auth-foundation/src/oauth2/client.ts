/* eslint max-depth: [2, 4] */
import type {
  OpenIdConfiguration,
  OAuth2ErrorResponse,
  JsonRecord,
} from '../types';
import type { IDTokenValidatorContext } from '../jwt/IDTokenValidator';
import { isJWKS, isOAuth2ErrorResponse, isOpenIdConfiguration } from '../types';
import { OAuth2Error, JWTError, TokenError } from '../errors';
import { validateString, validateURL } from '../validators';
import {
  JWT,
  JWKS,
  DefaultIDTokenValidator,
  IDTokenValidator,
  DefaultTokenHashValidator,
  TokenHashValidator
} from '../jwt';
import { APIClient } from '../http';
import { Configuration as ConfigurationConstructor } from './configuration';
import { TokenJSON, Token } from '../Token';
import { createDPoPKeyPair, generateDPoPProof } from './dpop';
import { SynchronizedResult } from '../utils/SynchronizedResult';
import { PromiseQueue } from '../utils/PromiseQueue';
import { EventEmitter } from '../utils/EventEmitter';

// ref: https://developer.okta.com/docs/reference/api/oidc/

// openidConfig
// refresh (with locks)
// (private) preformRefresh
// revoke
// introspect
// userinfo
// jwks (keys endpoint)
// exchange
// validateToken

class TodoError extends Error {}

class NetworkError extends Error {}

// TODO: move to common place?
function assertReadableResponse(response: Response) {
  if (response.bodyUsed) {
    throw new TypeError('"response" body has been used already');
  }
}

/**
 * @group OAuth2Client
 */
export interface OAuth2ClientParams {
  baseURL: string | URL;
  clientId: string;
  scopes: string | string[];
  dpop?: boolean;
}

/** @internal */
export class OAuth2ClientEventEmitter extends EventEmitter {
  tokenWillRefresh (token: Token) {
    this.emit('token_will_refresh', { token });
  }
  tokenDidRefresh (token: Token) {
    this.emit('token_did_refresh', { token });
  }
}

/**
 * @group OAuth2Client
 */
export class OAuth2Client extends APIClient {
  public static readonly idTokenValidator: IDTokenValidator = DefaultIDTokenValidator;
  public static readonly accessTokenValidator: TokenHashValidator = DefaultTokenHashValidator('accessToken');

  #httpCache: Map<string, JsonRecord> = new Map();
  #pendingRefresh: WeakMap<Token, Promise<Token | OAuth2ErrorResponse>> = new WeakMap();
  #dpopNonces: Map<string, string> = new Map();
  private readonly queue: PromiseQueue = new PromiseQueue();
  readonly emitter: OAuth2ClientEventEmitter = new OAuth2ClientEventEmitter();
  readonly configuration: OAuth2Client.Configuration;

  constructor (params: OAuth2ClientParams);
  constructor (configuration: OAuth2Client.Configuration);
  constructor (params: OAuth2ClientParams | OAuth2Client.Configuration) {
    super();

    if (params instanceof OAuth2Client.Configuration) {
      this.configuration = params;
    }
    else {
      this.configuration = new OAuth2Client.Configuration(params);
    }
  }

  private async handleOAuthBodyError (response: Response) {
    if (response.status > 399 && response.status < 500) {
      assertReadableResponse(response);
      try {
        const json = await response.json();
        if (validateString(json.error)) {
          if (json.error_description !== undefined && typeof json.error_description !== 'string') {
            delete json.error_description;
          }
          if (json.error_uri !== undefined && typeof json.error_uri !== 'string') {
            delete json.error_uri;
          }
          if (json.algs !== undefined && typeof json.algs !== 'string') {
            delete json.algs;
          }
          if (json.scope !== undefined && typeof json.scope !== 'string') {
            delete json.scope;
          }
          return <OAuth2Error>json;
        }
      } catch {
        // TODO: what can we do if we can't read the error?
      }
    }
    return undefined;
  }

  private async processOAuthResponse (response: Response): Promise<Record<string, any> | OAuth2ErrorResponse> {
    assertReadableResponse(response);

    try {
      const nonce = response.headers.get('dpop-nonce');
      if (nonce) {
        this.#dpopNonces.set(new URL(response.url).origin, nonce);
      }
    // eslint-disable-next-line no-empty
    } catch (err) {}

    if (response.status !== 200) {
      const err = await this.handleOAuthBodyError(response);
      if (err) {
        return err;
      }
    }

    let json;
    try {
      json = await response.json();
    }
    catch (err) {
      // TODO: throw
    }

    return json;
  }

  // TODO: cache response (is map sufficient?)
  private async getJson (url: URL): Promise<JsonRecord> {
    if (this.#httpCache.has(url.href)) {
      return this.#httpCache.get(url.href)!;
    }

    const headers = new Headers();
    headers.set('accept', 'application/json');

    const response = await this.internalFetch(url, {
      headers,
      method: 'GET',
      redirect: 'manual'
    });

    if (!response.ok) {
      throw new NetworkError(url.href);
    }

    const json = await response.json();
    this.#httpCache.set(url.href, json);
    return json;
  }

  public async openIdConfiguration (): Promise<OpenIdConfiguration> {
    const url = this.configuration.discoveryURL;

    const openIdConfig = await this.getJson(url);
    if (!isOpenIdConfiguration(openIdConfig)) {
      throw new OAuth2Error('Unexpected payload from `/.well-known/openid-configuration`');
    }
    return openIdConfig;
  }

  public async jwks (): Promise<JWKS> {
    const openIdConfig = await this.openIdConfiguration();
    const url = openIdConfig.jwks_uri!;
  
    const jwks = await this.getJson(new URL(url));
  
    if (!isJWKS(jwks.keys)) {
      throw new OAuth2Error(`Unexpected response from ${openIdConfig.jwks_uri}`);
    }

    // `areJWKs` is type predicate
    return jwks.keys;
  }

  private async sendTokenRequest (
    tokenRequest: Token.TokenRequest,
    options: OAuth2Client.TokenRequestOptions = {}
  ): Promise<Token | OAuth2ErrorResponse> {
    const request = tokenRequest.request();

    const { keyPairId: dpopPairId, dpopNonce } = options;
    if (this.configuration.dpop) {
      if (!dpopPairId) {
        throw new TodoError('TODO - no dpop key when required');
      }

      const dpopProof = await generateDPoPProof({ request, keyPairId: dpopPairId, nonce: dpopNonce });
      request.headers.set('dpop', dpopProof);
    }

    const response = await this.internalFetch(request);
    const json = await this.processOAuthResponse(response);

    if (isOAuth2ErrorResponse(json)) {
      // error	"use_dpop_nonce"
      // error_description	"Authorization server requires nonce in DPoP proof."
      // NOTE: only retry token request if `!dpopNonce` to prevent infinite loops
      if (this.configuration.dpop && !dpopNonce && json.error === 'use_dpop_nonce') {
        const nonce = response.headers.get('dpop-nonce');
        if (nonce) {
          // if a dpop-nonce is now available, retry same request (with nonce value)
          return this.sendTokenRequest(tokenRequest, { keyPairId: dpopPairId, dpopNonce: nonce });
        }
      }

      return json;
    }

    const context: Token.Context = {
      issuer: tokenRequest.openIdConfiguration.issuer,
      clientId: this.configuration.clientId,
      scopes: this.configuration.scopes,
    };

    if (this.configuration.dpop && dpopPairId) {
      context.dpopPairId = dpopPairId;
    }

    const result: TokenJSON = {
      tokenType: json.token_type,
      expiresIn: json.expires_in,
      accessToken: json.access_token,
      refreshToken: json.refresh_token,
      scopes: json.scope,
      context
    };

    if (json.id_token) {
      result.idToken = new JWT(json.id_token);
    }

    if (tokenRequest instanceof Token.RefreshRequest) {
      result.id = tokenRequest.id;
    }

    const token = new Token(result);
    return token;
  }

  private async validateToken (
    request: Token.TokenRequest,
    keySet: JWKS,
    token: Token
  ): Promise<Token | OAuth2ErrorResponse> {
    if (token.idToken) {
      // eslint-disable-next-line camelcase
      const { issuer, id_token_signing_alg_values_supported } = await this.openIdConfiguration();

      if (!validateURL(issuer)) {
        throw new TokenError('invalidConfiguration');
      }

      const context = request as IDTokenValidatorContext;

      // TODO: how to override this?
      // Will throw if invalid
      OAuth2Client.idTokenValidator.validate(token.idToken, new URL(issuer), this.configuration.clientId, {
        // eslint-disable-next-line camelcase
        supportedAlgs: id_token_signing_alg_values_supported, ...context
      });

      await OAuth2Client.accessTokenValidator.validate(token.accessToken, token.idToken);

      // TODO: if deviceSecret: await Token.deviceSecretValidator.validate

      const isIDTokenValid = await token.idToken.verifySignature(keySet);
      if (!isIDTokenValid) {
        throw new JWTError('Unable to verify id token signature');
      }
    }

    // TODO: valid accesstoken at_hash

    return token;
  }

  public async exchange (request: Token.TokenRequest): Promise<Token | OAuth2ErrorResponse> {
    const tokenOptions: OAuth2Client.TokenRequestOptions = {};
    if (this.configuration.dpop) {
      const keyPairId = await createDPoPKeyPair();
      tokenOptions.keyPairId = keyPairId;
    }

    const [keySet, response] = await Promise.all([
      this.jwks(),
      this.sendTokenRequest(request, tokenOptions)
    ]);

    if (isOAuth2ErrorResponse(response)) {
      return response;
    }

    return this.validateToken(request, keySet, response);
  }

  public async refresh (token: Token): Promise<Token | OAuth2ErrorResponse> {
    if (this.#pendingRefresh.has(token)) {
      return this.#pendingRefresh.get(token)!;
    }

    if (!token.refreshToken) {
      throw new OAuth2Error(`Missing token: refreshToken`);
    }

    const synchronizer = new SynchronizedResult<Token | OAuth2ErrorResponse, TokenJSON | OAuth2ErrorResponse>(
      `refresh:${token.id}`,
      this.performRefresh.bind(this, token),
      {
        // NOTE: I tried everything I could think to avoid casting `response.toJSON()` (even adding a generic to the mixin signature).
        // It seems like the mixin pattern mucks with types too much for TS to figure it out
        seralizer: (response: Token | OAuth2ErrorResponse) => isOAuth2ErrorResponse(response) ? response : response.toJSON() as TokenJSON,
        deseralizer: (response: TokenJSON | OAuth2ErrorResponse) =>
          isOAuth2ErrorResponse(response) ? response : new Token({id: token.id, ...response}),
      }
    );

    let tokenRequest: Promise<Token | OAuth2ErrorResponse>;
    try {
      // wraps refresh action in a local promise queue and tab-synchronized result
      tokenRequest = this.queue.push(() => synchronizer.exec());
    }
    finally {
      // clean up pendingRefresh map
      this.#pendingRefresh.delete(token);
    }
    return tokenRequest;
  }

  // TODO: use clientSettings
  // private async performRefresh (token: Token, clientSettings: Record<string, string>) {
  private async performRefresh (token: Token) {
    // TODO: remove, for testing
    // await (new Promise(resolve => setTimeout(resolve, 5000)));

    if (!token.refreshToken) {
      return { error: `Missing token: refreshToken` };
    }

    // TODO: use clientSettings

    this.emitter.tokenWillRefresh(token);

    const openIdConfiguration = await this.openIdConfiguration();
    const request = new Token.RefreshRequest({
      id: token.id,
      openIdConfiguration,
      clientConfiguration: this.configuration,
      refreshToken: token.refreshToken
    });

    const tokenOptions: OAuth2Client.TokenRequestOptions = {};
    if (token.context.dpopPairId) {
      tokenOptions.keyPairId = token.context.dpopPairId;
    }

    const [keySet, response] = await Promise.all([
      this.jwks(),
      this.sendTokenRequest(request, tokenOptions)
    ]);

    if (isOAuth2ErrorResponse(response)) {
      return response;
    }

    const newToken = response.merge(token);
    await this.validateToken(request, keySet, newToken);
    this.emitter.tokenDidRefresh(newToken);
    return newToken;
  }

  // TODO: userInfo

  // TODO: introspect

  public async revoke (token: Token, type: Token.RevokeType): Promise<void | OAuth2ErrorResponse> {
    if (type === 'ALL') {
      return this.revokeAll(token);
    }

    let tokenString: string | undefined;
    let hint: 'access_token' | 'refresh_token' | undefined;

    switch (type) {
      case 'ACCESS':
        tokenString = token.accessToken;
        hint = 'access_token';
        break;
      case 'REFRESH':
        tokenString = token.refreshToken;
        hint = 'refresh_token';
        break;
      default:
        throw new Error(`Unrecognized Token Type: ${type}`);
    }

    if (!tokenString || !hint) {
      throw new TokenError(`missing expected token (${type})`);
    }

    const openIdConfiguration = await this.openIdConfiguration();
    const request = new Token.RevokeRequest({
      openIdConfiguration,
      token: tokenString,
      hint,
      clientConfiguration: this.configuration,
      clientAuthentication: this.configuration.authentication
    }).request();

    const response = await this.internalFetch(request);
    const json = await this.processOAuthResponse(response);

    if (isOAuth2ErrorResponse(json)) {
      return json;
    }
  }

  private async revokeAll (token: Token): Promise<void | OAuth2ErrorResponse> {
    const types: Token.RevokeType[] = ['ACCESS'];

    if (token.refreshToken) {
      types.push('REFRESH');
    }

    const responses = await Promise.all(
      types.map(type => this.revoke(token, type))
    );

    for (const r of responses) {
      if (isOAuth2ErrorResponse(r)) {
        return r;
      }
    }
  }
}

/**
 * @group OAuth2Client
 */
export namespace OAuth2Client {
  export class Configuration extends ConfigurationConstructor {}

  /** @internal */
  export type TokenRequestOptions = {
    keyPairId?: string;
    dpopNonce?: string;
  };
}
