/* eslint max-len: [2, 145] */
import type { AuthContext } from '../types';
import {
  type OAuth2ErrorResponse,
  type TimeInterval,
  PKCE,
  OAuth2Error,
  isOAuth2ErrorResponse,
  getSearchParam,
  randomBytes,
  mergeURLSearchParameters,
  Token,
} from '@okta/auth-foundation';
import OAuth2Client from '@okta/auth-foundation/client';
import {
  AuthenticationFlow,
  AuthenticationFlowError
} from '../AuthenticationFlow';
import { AuthTransaction } from '../AuthTransaction';


/**
 * @module AuthorizationCodeFlow
 */

function bindOktaPostMessageListener ({
  state,
  timeout = 120000
}): Promise<AuthorizationCodeFlow.RedirectValues | OAuth2ErrorResponse>
{
  let handler: (evt: MessageEvent<any>) => void;
  let timeoutId: NodeJS.Timeout;
  return (new Promise<AuthorizationCodeFlow.RedirectValues | OAuth2ErrorResponse>((resolve, reject) => {
    handler = function (e) {
      if (!e.data || e.data.state !== state) {
        // A message not meant for us
        return;
      }

      resolve(e.data);
    };

    window.addEventListener('message', handler);

    timeoutId = setTimeout(() => {
      reject(new AuthenticationFlowError('Authentication flow timed out'));
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
export class AuthorizationCodeFlow extends AuthenticationFlow {
  readonly client: OAuth2Client;
  // readonly context: AuthContext = {};
  readonly redirectUri: string;
  readonly additionalParameters: Record<string, string>;

  private context: AuthorizationCodeFlow.Context | null = null;
  private authorizeUrl: URL | null = null;

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
  private parseAuthorizationCode (url: URL): AuthorizationCodeFlow.RedirectValues | OAuth2ErrorResponse {
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
  private buildAuthorizeURL (url: string, context: AuthorizationCodeFlow.Context, additionalParameters: Record<string, string>): URL {
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
  public async start (
    meta: AuthorizationCodeFlow.TransactionMeta = {},
    context?: AuthorizationCodeFlow.Context,
    additionalParameters: Record<string, string> = {}
  ): Promise<URL> {
    this.startFlow();

    try {
      const flowContext: AuthorizationCodeFlow.Context = context ?? await AuthorizationCodeFlow.Context();

      const openIdConfig = await this.client.openIdConfiguration();

      flowContext.redirectUri = this.redirectUri;
      flowContext.meta = meta;
      this.context = flowContext;

      if (!openIdConfig.authorization_endpoint) {
        throw new OAuth2Error('Missing `authorization_endpoint` from ./well-known config');
      }

      const url = this.buildAuthorizeURL(openIdConfig.authorization_endpoint, flowContext, additionalParameters);
      this.authorizeUrl = url;

      return url;
    }
    catch (err) {
      this.reset();
      this.emitter.flowErrored({ error: err });
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
  
      // TODO: does loading the transaction from storage count as a state check?
  
      const result = await this.exchangeCodeForTokens(code, context);
      return result;
    }
    catch (err) {
      this.emitter.flowErrored({ error: err });
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

    const response = await this.client.exchange(request);

    if (isOAuth2ErrorResponse(response)) {
      throw new OAuth2Error(response);
    }

    // TODO: consider renaming meta vs context?
    return { token: response, context: meta };
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
    if (!flow.inProgress) {
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
    if (!flow.inProgress) {
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
        throw new OAuth2Error(values);
      }

      const { code, state: stateValue } = values;
      if (state !== stateValue) {
        throw new AuthenticationFlowError('OAuth `state` values do not match');
      }

      return flow.exchangeCodeForTokens(code, context);
    }
    finally {
      // finally, remove iframe
      if (document.body.contains(iframe)) {
        iframe.parentElement?.removeChild(iframe);
      }
      flow.reset();
    }
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
    state: string;
    pkce: PKCE;
    nonce?: string;
    maxAge?: TimeInterval;
    scopes?: string[];
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
