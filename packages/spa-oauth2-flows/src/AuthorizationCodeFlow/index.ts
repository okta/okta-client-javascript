/* eslint max-len: [2, 145] */
import type { AuthorizationCodeFlowOptions, RedirectValues } from './types';
import {
  type OAuth2ErrorResponse,
  type TimeInterval,
  AuthContext,
  AuthTransaction,
  PKCE,
  OAuth2Error,
  isOAuth2ErrorResponse,
  getSearchParam,
  randomBytes,
  mergeURLSearchParameters,
  Token
} from '@okta/auth-foundation';
import OAuth2Client from '@okta/auth-foundation/client';


/**
 * @module AuthorizationCodeFlow
 */

function bindOktaPostMessageListener ({ state, timeout = 120000 }): Promise<RedirectValues | OAuth2ErrorResponse> {
  let handler: (evt: MessageEvent<any>) => void;
  let timeoutId: NodeJS.Timeout;
  return (new Promise<RedirectValues | OAuth2ErrorResponse>((resolve, reject) => {
    handler = function (e) {
      if (!e.data || e.data.state !== state) {
        // A message not meant for us
        return;
      }

      resolve(e.data);
    };

    window.addEventListener('message', handler);

    timeoutId = setTimeout(() => {
      // TODO: Error type?
      reject(new Error('OAuth flow timed out'));
    }, timeout);
  }))
  .finally(() => {
    clearTimeout(timeoutId);
    window.removeEventListener('message', handler);
  });
}

/**
 * An implementation of Authorization Code Flow designed for Single Page Apps (SPA)
 * 
 * There are two strategies for calling `/authorize` available in a browser environment
 * - `Redirect Model`
 * TODO
 * - `Silent Prompt`
 * TODO
 * 
 * @see 
 * Okta Documentation:
 * - Authorization Code Flow: {@link https://developer.okta.com/docs/concepts/oauth-openid/#authorization-code-flow-with-pkce-flow | Concepts}
 * - Authorization Code Flow: {@link https://developer.okta.com/docs/guides/implement-grant-type/authcode/main/#authorization-code-flow | Guide}
 */
export class AuthorizationCodeFlow {
  readonly client: OAuth2Client;
  // readonly context: AuthContext = {};
  readonly redirectUri: string;
  readonly additionalParameters: Record<string, string>;

  private context: AuthorizationCodeFlow.Context | null = null;
  private authorizeUrl: URL | null = null;

  #isAuthenticating: boolean = false;

  constructor (options: AuthorizationCodeFlowOptions);
  constructor (client: OAuth2Client, options: AuthorizationCodeFlowOptions);
  constructor (client: OAuth2Client | AuthorizationCodeFlowOptions, options?: AuthorizationCodeFlowOptions) {
    if (client instanceof OAuth2Client) {
      this.client = client;
    }
    else {
      options = client as AuthorizationCodeFlowOptions;
      const { issuer, clientId, scopes, dpop } = options;
      this.client = new OAuth2Client({ baseURL: issuer, clientId, scopes, dpop });
    }

    // based on ctor signatures, options cannot be undefined at this point
    const { redirectUri, additionalParameters } = options!;

    this.redirectUri = (new URL(redirectUri)).href;
    this.additionalParameters = additionalParameters ?? {};
  }

  public get isAuthenticating (): boolean {
    return this.#isAuthenticating;
  }

  private set isAuthenticating (isAuthenticating: boolean) {
    this.#isAuthenticating = isAuthenticating;
    if (isAuthenticating) {
      // TODO: emit authenticationStarted
    }
    else {
      // TODO: emit authenticationFinished
    }
  }

  reset () {
    this.isAuthenticating = false;
    this.context = null;
    this.authorizeUrl = null;
  }

  /** @internal */
  private parseAuthorizationCode (url: URL): RedirectValues | OAuth2ErrorResponse {
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

    if (!code || !state) {
      // TODO: handle error
      throw new Error('parse error');
    }

    // TODO: compare to expected state, can this be done?

    return { code, state };
  }

  /** @internal */
  private buildAuthorizeURL (url: string, context: AuthorizationCodeFlow.Context, additionalParameters: Record<string, string>): URL {
    const authorizationUrl = new URL(url);
    authorizationUrl.searchParams.set('client_id', this.client.configuration.clientId);
    authorizationUrl.searchParams.set('scope', this.client.configuration.scopes);
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

    mergeURLSearchParameters(authorizationUrl.searchParams, this.additionalParameters);
    mergeURLSearchParameters(authorizationUrl.searchParams, additionalParameters);

    return authorizationUrl;
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
  async start (
    meta: AuthorizationCodeFlow.TransactionMeta = {},
    context?: AuthorizationCodeFlow.Context,
    additionalParameters: Record<string, string> = {}
  ): Promise<URL> {
    this.isAuthenticating = true;

    try {
      const flowContext: AuthorizationCodeFlow.Context = context ?? await AuthorizationCodeFlow.Context();

      const openIdConfig = await this.client.openIdConfiguration();

      flowContext.redirectUri = this.redirectUri;
      flowContext.meta = meta;
      this.context = flowContext;

      if (!openIdConfig.authorization_endpoint) {
        throw new OAuth2Error('Missing `authorization_endpoint` from ./well-known config');
      }
      console.log('context', flowContext);
      const url = this.buildAuthorizeURL(openIdConfig.authorization_endpoint, flowContext, additionalParameters);
      this.authorizeUrl = url;

      return url;
    }
    catch (err) {
      this.reset();

      // TODO:
      const oauthError = err ?? new Error('catch all');
      
      // TODO: emit error

      throw oauthError;   // throw?
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
    this.isAuthenticating = true;
    const currentUrl = new URL(redirectUri ?? window.location.href);

    const values = this.parseAuthorizationCode(currentUrl);
    if (isOAuth2ErrorResponse(values)) {
      throw new Error('OAuthError');  // TODO:
    }

    const { code, state } = values;

    try {
      const context = AuthTransaction.load(state) as AuthorizationCodeFlow.Context;
      if (!context) {
        // TODO: handle no stored transactions
        throw new Error('NoTransactionError');    // NoTransactionError?
      }
  
      // TODO: does loading the transaction from storage count as a state check?
  
      return this.exchangeCodeForTokens(code, context);
    }
    finally {
      try {
        if (state) {
          AuthTransaction.remove(state);
        }
      // eslint-disable-next-line no-empty
      } catch {}  // ignore storage errors
    }
  }

  /** @internal */
  private async exchangeCodeForTokens (code: string, context: AuthorizationCodeFlow.Context): Promise<AuthorizationCodeFlow.Result> {
    const openIdConfig = await this.client.openIdConfiguration();

    const { redirectUri, pkce, maxAge, nonce, meta } = context;

    const request = new AuthorizationCodeFlow.TokenRequest({
      openIdConfiguration: openIdConfig,
      clientConfiguration: this.client.configuration,
      code,
      redirectUri,
      pkce,
      maxAge,
      nonce
    });

    try {
      const response = await this.client.exchange(request);

      if (isOAuth2ErrorResponse(response)) {
        throw new OAuth2Error(response);
      }
  
      // TODO: emit authentication(response)
  
      // TODO: consider renaming meta vs context?
      return { token: response, context: meta };
    }
    finally {
      this.reset();
    }
  }

  /**
   * Performs a browser full-page redirect to the `Authorization Server` `/authorize` endpoint.
   * Once authentication is successful, the user will be redirected back to the provided `redirectUri`
   * 
   * @group Authorize Methods
   * 
   * @remarks
   * This method returns a `Promise` that will never fulfill; a browser redirect will occur first
   * 
   * @see
   * {@link AuthorizationCodeFlow.resume}
   */
  static async PerformRedirect (flow: AuthorizationCodeFlow): Promise<void> {
    if (!flow.isAuthenticating) {
      // starts flow if it hasn't been started already
      await flow.start();
    }

    // `.context` cannot be null if `.isAuthenticating` is true (after `.start` is called)
    const transaction = new AuthTransaction(flow.context!);
    transaction.save();

    return new Promise(() => {
      // `.authorizeUrl` cannot be null after `.start` is called
      window.location.assign(flow.authorizeUrl!);
    });
  }

  // TODO: handle errors?
  /**
   * Fulfills the `/authorize` request within a hidden iframe and therefore does *not* require a redirect.
   * This requires an existing cookie-based session with the IDP and is susceptible to third-party cookie restrictions.
   * 
   * @group Authorize Methods
   * 
   * @remarks
   * This approach is not recommended for most common use cases and may be deprecated in the future.
   * Use {@link AuthorizationCodeFlow.PerformRedirect} instead
   * 
   * @returns
   * Returns a {@link Token} and the {@link AuthorizationCodeFlow.Context} used to request the token
   * 
   * @see
   * - {@link https://auth0.com/docs/authenticate/login/configure-silent-authentication | Silent Authentication}
   * - {@link https://developers.google.com/privacy-sandbox/cookies | Third-party Cookie Deprecation}
   */
  static async PerformSilently (flow: AuthorizationCodeFlow): Promise<AuthorizationCodeFlow.Result> {
    if (!flow.isAuthenticating) {
      // starts flow if it hasn't been started already
      await flow.start();
    }

    // `.authorizeUrl` and `.context` cannot be null after `.start` is called
    // (okta_post_message does not involve a browser redirect)
    const authorizeUrl = flow.authorizeUrl!;
    const context = flow.context!;
    const state = context.state;

    // append okta post message params
    authorizeUrl.searchParams.set('prompt', 'none');
    authorizeUrl.searchParams.set('response_mode', 'okta_post_message');

    // bind okta post message listener
    const oktaPostMessage = bindOktaPostMessageListener({ state });

    // load iframe
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = authorizeUrl.href;
  
    document.body.appendChild(iframe);

    try {
      // handle response
      const values = await oktaPostMessage;

      if (isOAuth2ErrorResponse(values)) {
        throw new Error('OAuthError');
      }

      const { code, state: stateValue } = values;
      if (state !== stateValue) {
        throw new Error('OAuth `state` values do not match');
      }

      return flow.exchangeCodeForTokens(code, context);
    }
    finally {
      // finally, remove iframe
      if (document.body.contains(iframe)) {
        iframe.parentElement?.removeChild(iframe);
      }
    }
  }
}

export namespace AuthorizationCodeFlow {
  export type TransactionMeta = Record<string, string>;

  /**
   * Values needed to initiate an Authorization Code flow
   */
  export interface Context extends AuthContext {
    state: string;
    pkce: PKCE;
    nonce?: string;
    maxAge?: TimeInterval;
  }

  export type Result = {
    token: Token;
    context: Record<string, any>;
  };

  /** @internal */
  export async function Context (state?: string, maxAge?: TimeInterval): Promise<AuthorizationCodeFlow.Context> {
    const pkce = await PKCE.generate();
    return {
      state: state ?? randomBytes(),
      nonce: randomBytes(),
      maxAge: maxAge,
      pkce
    };
  }

  /** @internal */
  export interface TokenRequestParams extends Omit<Token.TokenRequestParams, 'grantType'> {
    code: string;
    redirectUri: string;
    pkce: PKCE;
    maxAge?: number;
    nonce?: string;
  }

  /** @internal */
  export class TokenRequest extends Token.TokenRequest {
    code: string;
    redirectUri: string;
    pkce: PKCE;
    maxAge?: number;
    nonce?: string;

    constructor (params: AuthorizationCodeFlow.TokenRequestParams) {
      const { openIdConfiguration, clientConfiguration } = params;
      super({ openIdConfiguration, clientConfiguration, grantType: 'authorization_code' });
      this.code = params.code;
      this.redirectUri = params.redirectUri;
      this.pkce = params.pkce;
      this.maxAge = params.maxAge;
      this.nonce = params.nonce;

      this.body.set('redirect_uri', this.redirectUri);
      this.body.set('code_verifier', this.pkce.verifier);
      this.body.set('code', this.code);
    }
  }
}
