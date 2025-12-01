/* eslint max-len: [2, 145] */

/**
 * @module AuthorizationCodeFlow
 */

import type { AuthContext } from '../types.ts';
import {
  type OAuth2ErrorResponse,
  type TimeInterval,
  type AcrValues,
  PKCE,
  OAuth2Error,
  isOAuth2ErrorResponse,
  getSearchParam,
  randomBytes,
  mergeURLSearchParameters,
  Token,
  AuthSdkError,
} from '@okta/auth-foundation';
import OAuth2Client from '@okta/auth-foundation/client';
import {
  AuthenticationFlow,
  AuthenticationFlowError
} from '../AuthenticationFlow.ts';
import { AuthTransaction } from '../AuthTransaction.ts';


/**
 * An implementation of Authorization Code Flow
 * 
 * @remarks
 * Currently only supports Zero Trust Clients
 * 
 * @example
 * ```typescript
 * const client = new OAuth2Client(params);
 * const signInFlow = new AuthorizationCodeFlow(client, {
 *   redirectUri: `${window.location.origin}/login/callback`
 * });
 * 
 * const signInUrl = await signInFlow.start();
 * window.location.assign(signInUrl);
 * 
 * // User authenticates by interacting with UI hosted by Authorization Server
 *
 * // Upon successful authentication and after a redirect to `redirectUri`
 * 
 * const { token, context } = await signInFlow.resume(window.location.href);
 * 
 * ```
 * 
 * @see 
 * Okta Documentation:
 * - {@link https://developer.okta.com/docs/concepts/oauth-openid/#authorization-code-flow-with-pkce-flow | Concepts}
 * - {@link https://developer.okta.com/docs/guides/implement-grant-type/authcode/main/#authorization-code-flow | Guide}
 * 
 * Additional References:
 * - {@link https://auth0.com/docs/get-started/authentication-and-authorization-flow/authorization-code-flow | Auth0}
 * - {@link https://oauth.net/2/grant-types/authorization-code | OAuth.net}
 * - {@link https://datatracker.ietf.org/doc/html/rfc6749#section-1.3.1 | RFC}
 */
export class AuthorizationCodeFlow extends AuthenticationFlow {
  readonly client: OAuth2Client;
  readonly redirectUri: string;
  readonly additionalParameters: Record<string, string>;

  protected context: AuthorizationCodeFlow.Context | null = null;
  protected authorizeUrl: URL | null = null;

  constructor (options: AuthorizationCodeFlow.InitOptions);
  constructor (client: OAuth2Client, options: AuthorizationCodeFlow.RedirectParams);
  constructor (
    client: OAuth2Client | AuthorizationCodeFlow.InitOptions,
    options?: AuthorizationCodeFlow.InitOptions | AuthorizationCodeFlow.RedirectParams
  ) {
    super();
    if (client instanceof OAuth2Client) {
      this.client = client;
    }
    else {
      const { issuer, redirectUri, additionalParameters, ...oauth2Params } = client;
      this.client = new OAuth2Client({ baseURL: issuer, ...oauth2Params });
      options = { redirectUri, additionalParameters };
    }

    const { redirectUri, additionalParameters } = options as AuthorizationCodeFlow.RedirectParams;

    this.redirectUri = (new URL(redirectUri)).href;
    this.additionalParameters = additionalParameters ?? {};
  }

  public get isAuthenticating (): boolean {
    return this.inProgress;
  }

  reset () {
    super.reset();
    this.context = null;
    this.authorizeUrl = null;
  }

  /** @internal */
  protected parseAuthorizationCode (url: URL): AuthorizationCodeFlow.RedirectValues | OAuth2ErrorResponse {
    const params = url.searchParams;

    const error = getSearchParam(params, 'error');
    if (error) {
      return {
        error,
        errorDescription: getSearchParam(params, 'error_description'),
        errorUri: getSearchParam(params, 'error_uri'),
      };
    }

    const code = getSearchParam(params, 'code');
    const state = getSearchParam(params, 'state');

    if (!code) {
      throw new AuthenticationFlowError('Failed to parse `code` from redirect url');
    }
    if (!state) {
      throw new AuthenticationFlowError('Failed to parse `state` from redirect url');
    }

    // TODO: compare to expected state, can this be done?

    return { code, state };
  }

  /** @internal */
  protected buildAuthorizeURL (url: string, context: AuthorizationCodeFlow.Context, additionalParameters: Record<string, string>): URL {
    const authorizationUrl = new URL(url);
    authorizationUrl.searchParams.set('client_id', this.client.configuration.clientId);
    authorizationUrl.searchParams.set('scope', context.scopes?.join(' ') ?? this.client.configuration.scopes);
    authorizationUrl.searchParams.set('state', context.state);
  
    authorizationUrl.searchParams.set('redirect_uri', context.redirectUri);
    authorizationUrl.searchParams.set('response_type', 'code');
   
    if (context.nonce) {
      authorizationUrl.searchParams.set('nonce', context.nonce);
    }

    if (context.pkce) {
      authorizationUrl.searchParams.set('code_challenge', context.pkce.challenge);
      authorizationUrl.searchParams.set('code_challenge_method', context.pkce.method);
    }

    if (context.acrValues) {
      // https://developer.okta.com/docs/api/openapi/okta-oauth/oauth/tag/OrgAS/#tag/OrgAS/operation/authorize!in=query&path=acr_values&t=request
      // Note: Multiple space-delimited values may be provided.
      // The authorization server chooses one and reflects the chosen value in any resulting tokens
      if (Array.isArray(context.acrValues)) {
        authorizationUrl.searchParams.set('acr_values', context.acrValues.join(' '));
      }
      else {
        authorizationUrl.searchParams.set('acr_values', context.acrValues);
      }
    }

    if (context.maxAge) {
      authorizationUrl.searchParams.set('max_age', context.maxAge.toString());
    }

    mergeURLSearchParameters(authorizationUrl.searchParams, this.additionalParameters);
    mergeURLSearchParameters(authorizationUrl.searchParams, additionalParameters);

    return authorizationUrl;
  }

  /**
   * @internal
   * Ensures all values of `AuthorizationCodeFlow.Context` are defined from a partial
   */
  protected async prepare (context: Partial<AuthorizationCodeFlow.Context> = {}): Promise<AuthorizationCodeFlow.Context> {
    let { pkce, verifier } = context;
    if (!pkce || !verifier) {
      const { challenge, method, verifier: generatedVerifier } = await PKCE.generate();
      pkce = { challenge, method };
      verifier = generatedVerifier;
    }

    return {
      ...context,
      redirectUri: this.redirectUri,
      state: context.state ?? randomBytes(),
      nonce: context.nonce ?? randomBytes(),
      pkce,
      verifier
    };
  }

  /**
   * Initiates an Authorization Code flow
   * 
   * @param meta - A map of key/values to be loaded upon redirect from `Authorization Server` back to `Web App`
   * @param context - **Optional.** {@link AuthorizationCodeFlow.Context} can be provided. One will be created if none is provided
   * @param additionalParameters - **Optional.** A map of URL query parameters to be added to the `/authorize` request
   * @returns A {@link https://developer.mozilla.org/en-US/docs/Web/API/URL/URL | URL} instance representing `Authorization Server` `/authorize`
   * with all required query parameters
   */
  public async start (
    meta: AuthorizationCodeFlow.TransactionMeta = {},
    context: Partial<AuthorizationCodeFlow.Context> = {},
    additionalParameters: Record<string, string> = {}
  ): Promise<URL> {
    this.startFlow();

    try {
      const flowContext: AuthorizationCodeFlow.Context = await this.prepare(context);

      const openIdConfig = await this.client.openIdConfiguration();

      flowContext.redirectUri = this.redirectUri;
      flowContext.meta = meta;

      if (!openIdConfig.authorization_endpoint) {
        throw new OAuth2Error('Missing `authorization_endpoint` from ./well-known config');
      }

      const url = this.buildAuthorizeURL(openIdConfig.authorization_endpoint, flowContext, additionalParameters);
      this.authorizeUrl = url;

      // after pkce code challenge is used, delete it
      delete flowContext.pkce;
      this.context = flowContext;

      return url;
    }
    catch (err) {
      this.reset();
      this.emitter.emit('flow_errored', { error: err });
      throw err;
    }
  }

  /**
   * Continues an Authorization Code flow. Used when handling the redirect back to the `Web App` from an `Authorization Server`
   * 
   * @remarks
   * This method will only be used with `Redirect Model`
   * 
   * @param redirectUri 
   * @returns 
   */
  async resume (redirectUri?: string): Promise<AuthorizationCodeFlow.Result> {
    this.inProgress = true;

    let oauthState = '';
    try {
      const currentUrl = new URL(redirectUri ?? window.location.href);

      const values = this.parseAuthorizationCode(currentUrl);
      if (isOAuth2ErrorResponse(values)) {
        throw new OAuth2Error(values);
      }

      const { code, state } = values;
      oauthState = state;

      const context = await AuthTransaction.load(state) as AuthorizationCodeFlow.Context;
      if (!context) {
        throw new AuthenticationFlowError(`Failed to load auth transaction for state ${state}`);
      }
      this.context = context;
  
      const result = await this.exchangeCodeForTokens(code, context);
      return result;
    }
    catch (err) {
      if (this.context && err instanceof AuthSdkError) {
        err.context = this.context;
      }
      this.emitter.emit('flow_errored', { error: err });
      throw err;
    }
    finally {
      try {
        if (oauthState) {
          await AuthTransaction.remove(oauthState);
        }
        this.reset();
      // eslint-disable-next-line no-empty
      } catch {}  // ignore storage errors
    }
  }

  /** @internal */
  protected async exchangeCodeForTokens (code: string, context: AuthorizationCodeFlow.Context): Promise<AuthorizationCodeFlow.Result> {
    const openIdConfig = await this.client.openIdConfiguration();
    const { redirectUri, verifier, maxAge, acrValues, nonce, meta } = context;

    const request = new AuthorizationCodeFlow.TokenRequest({
      openIdConfiguration: openIdConfig,
      clientConfiguration: this.client.configuration,
      code,
      redirectUri,
      verifier,
      maxAge,
      acrValues,
      nonce
    });

    const response = await this.client.exchange(request);

    if (isOAuth2ErrorResponse(response)) {
      throw new OAuth2Error(response);
    }

    // TODO: consider renaming meta vs context?
    return { token: response, context: meta };
  }
}

export namespace AuthorizationCodeFlow {
  export type RedirectParams = {
    redirectUri: string | URL;
    additionalParameters?: Record<string, string>;
  };

  export type InitOptions = AuthenticationFlow.Options & RedirectParams;

  export interface RedirectValues {
    code: string;
    state: string;
  }

  export type TransactionMeta = Record<string, string>;

  /**
   * Values needed to initiate an Authorization Code flow
   */
  export interface Context extends AuthContext {
    redirectUri: string;
    state: string;
    pkce?: PKCE.Challenge;
    verifier: string;
    nonce?: string;
    maxAge?: TimeInterval;
    scopes?: string[];
    acrValues?: AcrValues;
  }

  export type Result = {
    token: Token;
    context: Record<string, any>;
  };

  /** @internal */
  export interface TokenRequestParams extends Omit<Token.TokenRequestParams, 'grantType'> {
    code: string;
    redirectUri: string;
    verifier: string;
    nonce?: string;
  }

  /** @internal */
  export class TokenRequest extends Token.TokenRequest {
    code: string;
    redirectUri: string;
    verifier: string;
    nonce?: string;

    constructor (params: AuthorizationCodeFlow.TokenRequestParams) {
      const { openIdConfiguration, clientConfiguration, acrValues, maxAge } = params;
      super({ openIdConfiguration, clientConfiguration, acrValues, maxAge, grantType: 'authorization_code' });
      this.code = params.code;
      this.redirectUri = params.redirectUri;
      this.verifier = params.verifier;
      this.nonce = params.nonce;

      this.body.set('redirect_uri', this.redirectUri);
      this.body.set('code_verifier', this.verifier);
      this.body.set('code', this.code);
    }
  }
}
