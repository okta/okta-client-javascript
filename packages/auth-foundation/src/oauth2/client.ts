/**
 * @module OAuth2
 */

/* eslint max-depth: [2, 4] */
import type {
  OpenIdConfiguration,
  OAuth2ErrorResponse,
  JsonRecord
} from '../types/index.ts';
import type { IDTokenValidatorContext } from '../jwt/IDTokenValidator.ts';
import { isJWKS, isOAuth2ErrorResponse, isOpenIdConfiguration } from '../types/index.ts';
import { OAuth2Error, JWTError, TokenError } from '../errors/index.ts';
import { validateURL, validateString } from '../internals/validators.ts';
import {
  JWT,
  JWKS,
  DefaultIDTokenValidator,
  IDTokenValidator,
  DefaultTokenHashValidator,
  TokenHashValidator
} from '../jwt/index.ts';
import { APIClient, APIRequest } from '../http/index.ts';
import { DefaultDPoPSigningAuthority, type DPoPSigningAuthority } from './dpop/index.ts';
import { Configuration as ConfigurationConstructor, type ConfigurationParams } from './configuration.ts';
import { TokenInit, Token } from '../Token.ts';
import { UserInfo } from './requests/UserInfo.ts';
import { PromiseQueue } from '../utils/PromiseQueue.ts';
import { EventEmitter } from '../utils/EventEmitter.ts';
import { hasSameValues } from '../utils/index.ts';


// ref: https://developer.okta.com/docs/reference/api/oidc/

/**
 * @group OAuth2Client
 * @noInheritDoc
 */
export class OAuth2Client extends APIClient {
  /**
   * @group Customizations
   */
  public readonly dpopSigningAuthority: DPoPSigningAuthority = DefaultDPoPSigningAuthority;
  /**
   * @group Customizations
   */
  public static readonly idTokenValidator: IDTokenValidator = DefaultIDTokenValidator;
  /**
   * @group Customizations
   */
  public static readonly accessTokenValidator: TokenHashValidator = DefaultTokenHashValidator('accessToken');

  /** @internal */
  #httpCache: Map<string, JsonRecord> = new Map();
  /** @internal */
  #pendingRefresh: Map<string, Promise<Token | OAuth2ErrorResponse>> = new Map();
  /** @internal */
  protected readonly queue: PromiseQueue = new PromiseQueue();

  readonly emitter: EventEmitter<OAuth2Client.Events> = new EventEmitter();
  readonly configuration: OAuth2Client.Configuration;

  constructor (params: ConfigurationParams | OAuth2Client.Configuration) {
    const configuration = params instanceof OAuth2Client.Configuration ? params : new OAuth2Client.Configuration(params);
    super(configuration);
    this.configuration = configuration;
  }

  /** @internal */
  protected createToken (init: TokenInit): Token {
    return new Token(init);
  }

  /** @internal */
  protected getDPoPNonceCacheKey (request: APIRequest): string {
    return `${this.configuration.clientId}.${super.getDPoPNonceCacheKey(request)}`;
  }

  /**
   * @remarks
   * Auth Servers return a 400 with dpop-nonce header and a json body identifying the error
   * 
   * @see
   * - https://datatracker.ietf.org/doc/html/rfc9449#section-8
   * - https://datatracker.ietf.org/doc/html/rfc9449#figure-20
   * 
   * @internal
   */
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

  /** @internal */
  protected async prepareDPoPNonceRetry (request: APIRequest, nonce: string): Promise<void> {
    const { dpopPairId } = request.context;
    await this.dpopSigningAuthority.sign(request, { keyPairId: dpopPairId, nonce });
  }

  /** @internal */
  protected async getJson (url: URL, options: OAuth2Client.GetJsonOptions = {}): Promise<JsonRecord> {
    const { skipCache } = { ...OAuth2Client.DefaultGetJsonOptions, ...options };

    if (!skipCache && this.#httpCache.has(url.href)) {
      return this.#httpCache.get(url.href)!;
    }

    const headers = new Headers();
    headers.set('accept', 'application/json');

    const response = await this.fetch(url, {
      headers,
      method: 'GET',
      redirect: 'manual',
      // https://developer.mozilla.org/en-US/docs/Web/API/RequestInit#cache
      cache: skipCache ? 'reload': 'default'
    });
    const json = await response.json();

    this.#httpCache.set(url.href, json);
    return json;
  }

  /**
   * Retrieves the Authorization Server's OpenID configuration
   */
  public async openIdConfiguration (options: OAuth2Client.GetJsonOptions = {}): Promise<OpenIdConfiguration> {
    const url = this.configuration.discoveryURL;

    const openIdConfig = await this.getJson(url, options);
    if (!isOpenIdConfiguration(openIdConfig)) {
      throw new OAuth2Error('Unexpected payload from `/.well-known/openid-configuration`');
    }
    return openIdConfig;
  }

  /**
   * Retrieves the Authorization Server's {@link Core.JWKS | JWKS} key configuration
   */
  public async jwks (options: OAuth2Client.GetJsonOptions = {}): Promise<JWKS> {
    const openIdConfig = await this.openIdConfiguration(options);
    const url = openIdConfig.jwks_uri!;
  
    const jwks = await this.getJson(new URL(url), options);
  
    if (!isJWKS(jwks.keys)) {
      throw new OAuth2Error(`Unexpected response from ${openIdConfig.jwks_uri}`);
    }

    // `isJWKS` is type predicate
    return jwks.keys;
  }

  /** @internal */
  protected async sendTokenRequest (
    tokenRequest: Token.TokenRequest,
    requestContext: OAuth2Client.TokenRequestContext = {}
  ): Promise<Token | OAuth2ErrorResponse> {
    const { keyPairId: dpopPairId } = requestContext;
    const request = tokenRequest.prepare({ dpopPairId });

    const { acrValues, maxAge } = tokenRequest;

    if (this.configuration.dpop) {
      // dpop nonce may not be available for this request (undefined), this is expected
      const nonce = await this.getDPoPNonceFromCache(request);
      await this.dpopSigningAuthority.sign(request, { keyPairId: dpopPairId, nonce });
    }

    const response = await this.send(request);
    const json = await response.json();

    if (isOAuth2ErrorResponse(json)) {
      return json;
    }

    const tokenContext: Token.Context = {
      issuer: tokenRequest.openIdConfiguration.issuer,
      clientId: this.configuration.clientId,
      scopes: this.configuration.scopes.split(' '),   // TODO: revisit this maybe? Possible collision with returned scopes
      ...(acrValues && { acrValues }),
      ...(maxAge && { maxAge }),
      // TODO: client info
      // clientSettings: tokenRequest.clientConfiguration.serialize()
    };

    if (this.configuration.dpop && dpopPairId) {
      tokenContext.dpopPairId = dpopPairId;
    }

    const result: TokenInit = {
      tokenType: json.token_type,
      expiresIn: json.expires_in,
      accessToken: json.access_token,
      refreshToken: json.refresh_token,
      scopes: json.scope,
      context: tokenContext
    };

    if (json.id_token) {
      result.idToken = new JWT(json.id_token);
    }

    if (tokenRequest instanceof Token.RefreshRequest && tokenRequest.id) {
      result.id = tokenRequest.id;
    }

    const token = this.createToken(result);
    return token;
  }

  /** @internal */
  protected async validateToken (
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

      if (!validateURL(issuer, this.configuration.allowHTTP)) {
        throw new TokenError('invalidConfiguration');
      }

      const context = request as IDTokenValidatorContext;

      // Will throw if invalid
      OAuth2Client.idTokenValidator.validate(token.idToken, new URL(issuer), this.configuration.clientId, {
        // eslint-disable-next-line camelcase
        supportedAlgs: id_token_signing_alg_values_supported, ...context
      });

      await OAuth2Client.accessTokenValidator.validate(token.accessToken, token.idToken);

      // TODO: if deviceSecret: await Token.deviceSecretValidator.validate

      let isIDTokenValid: boolean;
      try {
        // attempt to verify idToken with current keySet (via jwks, which may be cached and therefore stale)
        isIDTokenValid = await token.idToken.verifySignature(keySet);
      }
      catch (err) {
        // indicates no public key was found in current keySet
        if (err instanceof JWTError && err.message === 'No public key found') {
          // attempts to re-fetch jwks (bypassing cache) and re-verifies idToken
          const newKeySet = await this.jwks({ skipCache: true });
          isIDTokenValid = await token.idToken.verifySignature(newKeySet);
        }
        else {
          throw err;
        }
      }

      if (!isIDTokenValid) {
        throw new JWTError('Unable to verify id token signature');
      }
    }

    return token;
  }

  /**
   * Attempts to exchange, and verify, a token from the provided request
   */
  public async exchange (request: Token.TokenRequest): Promise<Token | OAuth2ErrorResponse> {
    const context: OAuth2Client.TokenRequestContext = {};
    if (this.configuration.dpop) {
      const keyPairId = await this.dpopSigningAuthority.createDPoPKeyPair();
      context.keyPairId = keyPairId;
    }

    const [keySet, response] = await Promise.all([
      this.jwks(),
      this.sendTokenRequest(request, context)
    ]);

    if (isOAuth2ErrorResponse(response)) {
      return response;
    }

    return this.validateToken(request, keySet, response);
  }

  /**
   * Attempts to refresh the provided token, using the {@link Token.Token.refreshToken | refreshToken} if it is available
   */
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

    const tokenRequest = this.queue.push(this.prepareRefreshRequest.bind(this, token, scopes));
    tokenRequest.finally(() => {
      // clean up pendingRefresh map
      if (token.refreshToken) {
        this.#pendingRefresh.delete(token.refreshToken);
      }
    });

    this.#pendingRefresh.set(token.refreshToken, tokenRequest);
    return tokenRequest;
  }

  /** @internal */
  protected prepareRefreshRequest (token: Token, scopes?: string[]): Promise<Token | OAuth2ErrorResponse> {
    return this.performRefresh(token, scopes);
  }

  /** @internal */
  // TODO: use clientSettings
  /* eslint max-statements: [2, 28] */
  protected async performRefresh (token: Token, scopes?: string[]) {
    if (!token.refreshToken) {
      return { error: `Missing token: refreshToken` };
    }

    // TODO: use clientSettings

    this.emitter.emit('token_will_refresh', { token });

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

    const context: OAuth2Client.TokenRequestContext = {};
    if (token.context?.dpopPairId) {
      context.keyPairId = token.context.dpopPairId;
    }

    const [keySet, response] = await Promise.all([
      this.jwks(),
      this.sendTokenRequest(request, context)
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
      refreshedToken = this.createToken({
        ...(token.toJSON() as TokenInit),
        id: token.id,
        refreshToken: response.refreshToken
      });

      const tokenInit = { ...response.toJSON() } as TokenInit;
      newToken = this.createToken({
        ...tokenInit,
        // downscoped token should "inherit" context from "parent" token
        context: { ...refreshedToken.context, ...tokenInit.context },
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
    this.emitter.emit('token_did_refresh', { token: refreshedToken });
    return newToken;
  }

  /**
   * Attempts to revoke the provided token
   */
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

  /** @internal */
  protected async revokeAll (token: Token): Promise<void | OAuth2ErrorResponse> {
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

  /**
   * Introspects the provided token information
   */
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

  /**
   * Fetches the {@link UserInfo} associated with the provided token
   */
  public async userInfo (token: Token): Promise<UserInfo | OAuth2ErrorResponse> {
    const openIdConfiguration = await this.openIdConfiguration();
    const request = new UserInfo.Request({
      openIdConfiguration,
      clientConfiguration: this.configuration,
      token
    }).prepare();

    await token.authorize(request);     // signs request with authorization header
    const response = await this.send(request);
    const json = await response.json();

    if (isOAuth2ErrorResponse(json)) {
      return json;
    }

    return json as UserInfo;
  }
}

/**
 * @group OAuth2Client
 */
export namespace OAuth2Client {
  export class Configuration extends ConfigurationConstructor {}

  export type Events = {
    /**
     * Triggered when a token refresh attempt begins
     */
    'token_will_refresh': { token: Token };
    /**
     * Triggered when a token refresh attempt succeeds
     */
    'token_did_refresh': { token: Token };
  } & APIClient.Events;

  /** @internal */
  export type TokenRequestContext = {
    keyPairId?: string;
  };

  /** @internal */
  export const DefaultGetJsonOptions: GetJsonOptions = { skipCache: false };
  /** @internal */
  export type GetJsonOptions = {
    skipCache?: boolean;
  };
}
