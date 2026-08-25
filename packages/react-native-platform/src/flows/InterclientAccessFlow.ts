/**
 * @module
 * @mergeModuleWith Flows
 */

import {
  OAuth2Client,
  OAuth2Error,
  Token,
  mergeURLSearchParameters,
  randomBytes
} from '@okta/auth-foundation/core';
import { TokenExchangeFlow, AuthenticationFlowError } from '@okta/oauth2-flows';


/**
 * Implements Okta's Native-to-Web SSO — hands off the current native session to a companion web app
 * by exchanging it for a single-use `interclient_token` (via {@link TokenExchangeFlow}), then building
 * the Authorization Server's `/authorize` URL for the target web app.
 *
 * @remarks
 * This class only constructs a URL — loading it into a `WebView` (e.g. `react-native-webview`) is left
 * to the consuming application, so this package doesn't take on a `WebView` dependency.
 *
 * @example
 * ```typescript
 * const client = new OAuth2Client(params);
 * const flow = new InterclientAccessFlow(client, {
 *   redirectUri: `${appScheme}://callback`,
 *   targetWebAppClientId: '0oa...'
 * });
 *
 * const credential = await Credential.getDefault();
 * const url = await flow.launch(credential.token);
 * // load `url` into a WebView
 * ```
 *
 * @see {@link https://developer.okta.com/docs/guides/native-to-web-sso/main/ | Okta Documentation: Native to Web SSO}
 */
export class InterclientAccessFlow extends TokenExchangeFlow {
  readonly targetWebAppClientId: string;
  readonly redirectUri: string;
  readonly additionalParameters: Record<string, string>;

  /** Constructs a new {@link OAuth2Client} internally from `options` */
  constructor (options: InterclientAccessFlow.Init);
  /** Uses an existing {@link OAuth2Client} instance */
  constructor (client: OAuth2Client, options: InterclientAccessFlow.Params);
  constructor (
    client: OAuth2Client | InterclientAccessFlow.Init,
    options?: InterclientAccessFlow.Init | InterclientAccessFlow.Params
  ) {
    if (client instanceof OAuth2Client) {
      super(client);
    }
    else {
      const { redirectUri, targetWebAppClientId, additionalParameters, ...oauth2Params } = client;
      super(oauth2Params);
      options = { redirectUri, targetWebAppClientId, additionalParameters };
    }

    const { redirectUri, targetWebAppClientId, additionalParameters } = options as InterclientAccessFlow.Params;

    this.redirectUri = (new URL(redirectUri)).href;
    this.targetWebAppClientId = targetWebAppClientId;
    this.additionalParameters = additionalParameters ?? {};
  }

  /**
   * Exchanges the current session's tokens for a single-use interclient token, then builds the
   * Authorization Server's `/authorize` URL for the target web app.
   *
   * @param token - The current, authenticated session's {@link Token}
   * @returns The URL to load into a `WebView` — loading it establishes the target web app's session
   */
  async launch (token: Token): Promise<string> {
    if (!token.idToken) {
      throw new AuthenticationFlowError('Missing `idToken` on `token` — Native-to-Web SSO requires an OIDC session');
    }

    const interclientToken = await this.start({
      subjectToken: token.idToken.rawValue,
      subjectTokenType: 'urn:ietf:params:oauth:token-type:id_token',
      actorToken: token.accessToken,
      actorTokenType: 'urn:ietf:params:oauth:token-type:access_token',
      requestedTokenType: 'urn:okta:params:oauth:token-type:interclient_token',
      audience: `urn:okta:apps:${this.targetWebAppClientId}`
    });

    const openIdConfig = await this.client.openIdConfiguration();
    if (!openIdConfig.authorization_endpoint) {
      throw new OAuth2Error('Missing `authorization_endpoint` from ./well-known config');
    }

    return this.buildAuthorizeURL(openIdConfig.authorization_endpoint, interclientToken).href;
  }

  /** @internal */
  protected buildAuthorizeURL (url: string, interclientToken: Token): URL {
    const authorizeUrl = new URL(url);
    authorizeUrl.searchParams.set('client_id', this.targetWebAppClientId);
    authorizeUrl.searchParams.set('redirect_uri', this.redirectUri);
    authorizeUrl.searchParams.set('state', randomBytes());
    authorizeUrl.searchParams.set('response_type', 'code');
    authorizeUrl.searchParams.set('interclient_token', interclientToken.accessToken);

    mergeURLSearchParameters(authorizeUrl.searchParams, this.additionalParameters);

    return authorizeUrl;
  }
}

export namespace InterclientAccessFlow {
  /**
   * Params needed when constructing an {@link InterclientAccessFlow} from an existing {@link OAuth2Client}
   */
  export type Params = {
    /** Where the Authorization Server should redirect back to once the target web app's session has been established */
    redirectUri: string | URL;
    /** The `client_id` of the target web app that should assume the current session */
    targetWebAppClientId: string;
    /** Additional query parameters to include on the `/authorize` request */
    additionalParameters?: Record<string, string>;
  };

  /**
   * Options required to construct a {@link InterclientAccessFlow} instance
   * @interface
   */
  export type Init = TokenExchangeFlow.Options & Params;
}
