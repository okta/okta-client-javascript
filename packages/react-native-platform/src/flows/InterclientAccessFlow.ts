/**
 * @module
 * @mergeModuleWith Flows
 */

import { OAuth2Client, Token } from '@okta/auth-foundation/core';
import { TokenExchangeFlow, AuthenticationFlowError } from '@okta/oauth2-flows';


/**
 * Implements the native side of Okta's Native-to-Web SSO — hands off the current native session to a
 * companion web app by exchanging it for a single-use `interclient_token` (via {@link TokenExchangeFlow}),
 * then building a bootstrap URL on the web app's own domain.
 *
 * @remarks
 * This class only constructs a URL — loading it into a `WebView` (e.g. `react-native-webview`) is left
 * to the consuming application, so this package doesn't take on a `WebView` dependency. It also doesn't
 * build Okta's `/authorize` URL directly: the web app's own bootstrap page (e.g. `/native/sso`) does that,
 * using its existing `AuthorizationCodeFlow` — see `InterclientAccessExchangeFlow` in `@okta/spa-platform`.
 *
 * @example
 * ```typescript
 * const client = new OAuth2Client(params);
 * const flow = new InterclientAccessFlow(client, {
 *   bootstrapUrl: 'https://app.example.com/native/sso',
 *   targetWebAppClientId: '0oa...'
 * });
 *
 * const credential = await Credential.getDefault();
 * const url = await flow.launch(credential.token, '/messages');
 * // load `url` into a WebView
 * ```
 *
 * @see {@link https://developer.okta.com/docs/guides/native-to-web-sso/main/ | Okta Documentation: Native to Web SSO}
 */
export class InterclientAccessFlow extends TokenExchangeFlow {
  readonly targetWebAppClientId: string;
  readonly bootstrapUrl: string;

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
      const { bootstrapUrl, targetWebAppClientId, ...oauth2Params } = client;
      super(oauth2Params);
      options = { bootstrapUrl, targetWebAppClientId };
    }

    const { bootstrapUrl, targetWebAppClientId } = options as InterclientAccessFlow.Params;

    this.bootstrapUrl = (new URL(bootstrapUrl)).href;
    this.targetWebAppClientId = targetWebAppClientId;
  }

  /**
   * Exchanges the current session's tokens for a single-use interclient token, then builds the
   * web app's bootstrap URL.
   *
   * @param token - The current, authenticated session's {@link Token}
   * @param path - Optional path (relative to the web app) the user should land on once signed in
   * @returns The URL to load into a `WebView` — loading it hands the session off to the web app
   */
  async launch (token: Token, path?: string): Promise<string> {
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

    const url = new URL(this.bootstrapUrl);
    url.searchParams.set('token', interclientToken.accessToken);
    if (path) {
      url.searchParams.set('path', path);
    }

    return url.href;
  }
}

export namespace InterclientAccessFlow {
  /**
   * Params needed when constructing an {@link InterclientAccessFlow} from an existing {@link OAuth2Client}
   */
  export type Params = {
    /** The web app's bootstrap URL (e.g. `https://app.example.com/native/sso`) that will receive the interclient token */
    bootstrapUrl: string | URL;
    /** The `client_id` of the target web app that should assume the current session */
    targetWebAppClientId: string;
  };

  /**
   * Options required to construct a {@link InterclientAccessFlow} instance
   * @interface
   */
  export type Init = TokenExchangeFlow.Options & Params;
}
