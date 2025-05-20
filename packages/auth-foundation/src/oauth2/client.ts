/* eslint max-depth: [2, 4] */
import type {
  OpenIdConfiguration,
  OAuth2ErrorResponse,
  JsonRecord,
} from '../types';
import type { IDTokenValidatorContext } from '../jwt/IDTokenValidator';
import { isJWKS, isOAuth2ErrorResponse, isOpenIdConfiguration } from '../types';
import { OAuth2Error, JWTError, TokenError } from '../errors';
import { validateURL, validateString } from '../internals/validators';
import {
  JWT,
  JWKS,
  DefaultIDTokenValidator,
  IDTokenValidator,
  DefaultTokenHashValidator,
  TokenHashValidator
} from '../jwt';
import { APIClient, APIRequest } from '../http';
import { DefaultDPoPSigningAuthority, type DPoPSigningAuthority, DPoPNonceCache } from './dpop';
import { Configuration as ConfigurationConstructor, type ConfigurationParams } from './configuration';
import { TokenInit, Token } from '../Token';
import { SynchronizedResult } from '../utils/SynchronizedResult';
import { PromiseQueue } from '../utils/PromiseQueue';
import { EventEmitter } from '../utils/EventEmitter';
import { hasSameValues } from '../utils';


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
  public readonly dpopSigningAuthority: DPoPSigningAuthority = DefaultDPoPSigningAuthority;
  public static readonly idTokenValidator: IDTokenValidator = DefaultIDTokenValidator;
  public static readonly accessTokenValidator: TokenHashValidator = DefaultTokenHashValidator('accessToken');

  #httpCache: Map<string, JsonRecord> = new Map();
  #pendingRefresh: Map<string, Promise<Token | OAuth2ErrorResponse>> = new Map();
  private readonly queue: PromiseQueue = new PromiseQueue();
  protected readonly dpopNonceCache: DPoPNonceCache = new DPoPNonceCache.PersistentCache('okta-dpop-nonce');
  readonly emitter: OAuth2ClientEventEmitter = new OAuth2ClientEventEmitter();
  readonly configuration: OAuth2Client.Configuration;

  constructor (params: ConfigurationParams | OAuth2Client.Configuration, options?: APIClient.Options) {
    super(options);

    if (params instanceof OAuth2Client.Configuration) {
      this.configuration = params;
    }
    else {
      this.configuration = new OAuth2Client.Configuration(params);
    }
  }

  protected getDPoPNonceCacheKey (request: APIRequest): string {
    return `${this.configuration.clientId}.${super.getDPoPNonceCacheKey(request)}`;
  }

  // Auth Servers return a 400 with dpop-nonce header and a json body identifying the error
  // https://datatracker.ietf.org/doc/html/rfc9449#section-8
  // https://datatracker.ietf.org/doc/html/rfc9449#figure-20
  protected async checkForDPoPNonceErrorResponse (response: Response): Promise<string | undefined> {
    if (response.status === 400) {
      const json = await response.clone().json();

      if (isOAuth2ErrorResponse(json) && json.error === 'use_dpop_nonce') {
        const nonce = response.headers.get('dpop-nonce');
        if (nonce && validateString(nonce)) {
          return nonce;
        }
      }
    }
  }

  protected async prepareDPoPNonceRetry (request: APIRequest, nonce: string): Promise<APIRequest> {
    const { dpopPairId } = request.context;
    await this.dpopSigningAuthority.sign(request, { keyPairId: dpopPairId, nonce });
    return request;
  }

  private async getJson (url: URL): Promise<JsonRecord> {
    if (this.#httpCache.has(url.href)) {
      return this.#httpCache.get(url.href)!;
    }

    const headers = new Headers();
    headers.set('accept', 'application/json');

    const response = await this.fetch(url, {
      headers,
      method: 'GET',
      redirect: 'manual'
    });
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

    // `isJWKS` is type predicate
    return jwks.keys;
  }

  private async sendTokenRequest (
    tokenRequest: Token.TokenRequest,
    options: OAuth2Client.TokenRequestOptions = {}
  ): Promise<Token | OAuth2ErrorResponse> {
    const request = tokenRequest.prepare();

    const { keyPairId: dpopPairId } = options;
    if (this.configuration.dpop) {
      // dpop nonce may not be available for this request (undefined), this is expected
      const nonce = this.getDPoPNonceFromCache(request);
      await this.dpopSigningAuthority.sign(request, { keyPairId: dpopPairId, nonce });
    }

    const response = await this.send(request, { dpopPairId });
    const json = await response.json();

    if (isOAuth2ErrorResponse(json)) {
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

    const result: TokenInit = {
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

    if (tokenRequest instanceof Token.RefreshRequest && tokenRequest.id) {
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
    if (this.configuration.dpop && token.tokenType !== 'DPoP') {
      throw new TokenError(`'${token.tokenType}' token received when DPoP expected`);
    }

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

    return token;
  }

  public async exchange (request: Token.TokenRequest): Promise<Token | OAuth2ErrorResponse> {
    const tokenOptions: OAuth2Client.TokenRequestOptions = {};
    if (this.configuration.dpop) {
      const keyPairId = await this.dpopSigningAuthority.createDPoPKeyPair();
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

  public async refresh (token: Token, scopes?: string[]): Promise<Token | OAuth2ErrorResponse> {
    if (!token.refreshToken) {
      throw new OAuth2Error(`Missing token: refreshToken`);
    }

    // If there is a pending refresh request for a giving refresh token, wait that request to resolve
    if (this.#pendingRefresh.has(token.refreshToken)) {
      // refresh tokens are often single use, therefore sending concurrent requests against the same token
      // will most likely fail anyways, therefore waiting for the pending refresh request to finish still
      // has value even if the requests aren't indentical (aka different scopes)
      const response = await this.#pendingRefresh.get(token.refreshToken)!;
      // only propagate the result of the refresh request if the scopes match
      // TODO: consider propagating result if requests results in an OAuth Error (we would be unable to compare scopes)
      if (!isOAuth2ErrorResponse(response) && hasSameValues(response.scopes, scopes ?? token.scopes)) {
        return response;
      }
    }

    const synchronizer = new SynchronizedResult<Token | OAuth2ErrorResponse, TokenInit | OAuth2ErrorResponse>(
      `refresh:${token.refreshToken}`,
      this.performRefresh.bind(this, token, scopes),
      {
        // NOTE: I tried everything I could think to avoid casting `response.toJSON()` (even adding a generic to the mixin signature).
        // It seems like the mixin pattern mucks with types too much for TS to figure it out
        seralizer: (response: Token | OAuth2ErrorResponse) => isOAuth2ErrorResponse(response) ? response : response.toJSON() as TokenInit,
        deseralizer: (response: TokenInit | OAuth2ErrorResponse) =>
          isOAuth2ErrorResponse(response) ? response : new Token({id: token.id, ...response}),
      }
    );

    let tokenRequest: Promise<Token | OAuth2ErrorResponse>;
    // wraps refresh action in a local promise queue and tab-synchronized result
    tokenRequest = this.queue.push(() => synchronizer.exec());
    this.#pendingRefresh.set(token.refreshToken, tokenRequest);

    return tokenRequest.finally(() => {
      // clean up pendingRefresh map
      if (token.refreshToken) {
        this.#pendingRefresh.delete(token.refreshToken);
      }
    });
  }

  // TODO: use clientSettings
  // private async performRefresh (token: Token, clientSettings: Record<string, string>) {
  /* eslint max-statements: [2, 28] */
  private async performRefresh (token: Token, scopes?: string[]) {
    if (!token.refreshToken) {
      return { error: `Missing token: refreshToken` };
    }

    // TODO: use clientSettings

    this.emitter.tokenWillRefresh(token);

    const openIdConfiguration = await this.openIdConfiguration();
    const refreshParams: Token.RefreshRequestParams = {
      id: token.id,
      openIdConfiguration,
      clientConfiguration: this.configuration,
      refreshToken: token.refreshToken
    };

    if (!scopes) {
      refreshParams.scope = this.configuration.scopes;
    }
    else if (scopes.length > 0) {
      refreshParams.scope = scopes.join(' ');
    }

    const request = new Token.RefreshRequest(refreshParams);

    const tokenOptions: OAuth2Client.TokenRequestOptions = {};
    if (token.context?.dpopPairId) {
      tokenOptions.keyPairId = token.context.dpopPairId;
    }

    const [keySet, response] = await Promise.all([
      this.jwks(),
      this.sendTokenRequest(request, tokenOptions)
    ]);

    if (isOAuth2ErrorResponse(response)) {
      return response;
    }

    let newToken: Token;
    let refreshedToken: Token;

    // when refresh is used to produce a downscoped token via:
    // 1. providing a sub-set of scopes
    // 2. providing no scopes (empty array)
    if (!hasSameValues(response.scopes, token.scopes) || scopes?.length === 0) {
      refreshedToken = new Token({
        ...(token.toJSON() as TokenInit),
        id: token.id,
        refreshToken: response.refreshToken
      });

      newToken = new Token({
        ...(response.toJSON() as TokenInit),
        // token endpoint will return the original scopes during an empty downscope refresh
        scopes: (scopes?.length ?? -1) >= 1 ? response.scopes : undefined,
        refreshToken: undefined
      });
    }
    // standard token refresh
    else {
      newToken = response.merge(token);
      refreshedToken = newToken;
    }

    await this.validateToken(request, keySet, newToken);
    this.emitter.tokenDidRefresh(refreshedToken);
    return newToken;
  }

  // TODO: userInfo

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
    }).prepare();

    const response = await this.send(request);

    if (!response.ok) {
      const json = await this.send(request);
      if (isOAuth2ErrorResponse(json)) {
        return json;
      }
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

  public async introspect (token: Token, kind: Token.Kind): Promise<Token.IntrospectResponse | OAuth2ErrorResponse> {
    const openIdConfiguration = await this.openIdConfiguration();
    const request = new Token.IntrospectRequest({
      openIdConfiguration,
      token,
      type: kind,
      clientConfiguration: this.configuration,
      clientAuthentication: this.configuration.authentication
    }).prepare();

    const response = await this.send(request);
    const json = await response.json();

    if (isOAuth2ErrorResponse(json)) {
      return json;
    }

    return json as Token.IntrospectResponse;
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
  };
}
