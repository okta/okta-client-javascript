/**
 * @module
 * @mergeModuleWith Flows
 */

import {
  type OAuth2ErrorResponse,
  OAuth2Client,
  OAuth2Error,
  isOAuth2ErrorResponse,
  getSearchParam,
  Token,
} from '@okta/auth-foundation/core';
import {
  AuthenticationFlow,
  AuthenticationFlowError,
  parseOAuth2Callback
} from '@okta/oauth2-flows';


/**
 * Companion, web-side half of Okta's Native-to-Web SSO. Processes the redirect back from the
 * Authorization Server after a native app has handed its session off via an `interclient_token`
 * (see `InterclientAccessFlow` in `@okta/react-native-platform`).
 *
 * @remarks
 * Unlike {@link OAuth2Flows!AuthorizationCodeFlow | AuthorizationCodeFlow}, this flow never initiates
 * the `/authorize` request itself — the native app does — so there's no local
 * {@link OAuth2Flows!AuthTransaction | AuthTransaction} to load, and no PKCE `code_verifier` to send
 * when exchanging the resulting `code` for tokens, since this app never generated a challenge for one.
 *
 * @example
 * ```typescript
 * const client = new OAuth2Client(params);
 * const flow = new InterclientAccessFlow(client, {
 *   redirectUri: `${window.location.origin}/login/callback`
 * });
 *
 * // Upon redirect back from the Authorization Server (see `redirectUri` above)
 * const token = await flow.resume(window.location.href);
 * ```
 *
 * @see {@link https://developer.okta.com/docs/guides/native-to-web-sso/main/ | Okta Documentation: Native to Web SSO}
 */
export class InterclientAccessFlow extends AuthenticationFlow {
  readonly client: OAuth2Client;
  readonly redirectUri: string;

  constructor (options: InterclientAccessFlow.Init);
  constructor (client: OAuth2Client, options: InterclientAccessFlow.Params);
  constructor (
    client: OAuth2Client | InterclientAccessFlow.Init,
    options?: InterclientAccessFlow.Init | InterclientAccessFlow.Params
  ) {
    super();
    if (client instanceof OAuth2Client) {
      this.client = client;
    }
    else {
      const { redirectUri, ...oauth2Params } = client;
      this.client = new OAuth2Client({ ...oauth2Params });
      options = { redirectUri };
    }

    const { redirectUri } = options as InterclientAccessFlow.Params;

    this.redirectUri = (new URL(redirectUri)).href;
  }

  /**
   * Continues the flow after the Authorization Server redirects back to {@link InterclientAccessFlow.redirectUri}
   *
   * @param redirectUri - The full redirect-back URL (or just its search params), containing either
   * an authorization `code`, or an OAuth2 error response
   * @returns The exchanged {@link Token}
   */
  async resume (redirectUri: string | URL | URLSearchParams = window.location.href): Promise<Token> {
    this.inProgress = true;

    try {
      const callbackUrl = typeof redirectUri === 'string' ? new URL(redirectUri) : redirectUri;

      const values = parseOAuth2Callback(callbackUrl);
      if (isOAuth2ErrorResponse(values)) {
        throw new OAuth2Error(values);
      }

      const openIdConfiguration = await this.client.openIdConfiguration();
      const request = new InterclientAccessFlow.TokenRequest({
        openIdConfiguration,
        clientConfiguration: this.client.configuration,
        code: values.code,
        redirectUri: this.redirectUri
      });

      const response = await this.client.exchange(request);

      if (isOAuth2ErrorResponse(response)) {
        throw new OAuth2Error(response);
      }

      return response;
    }
    catch (err) {
      this.emitter.emit('flow_errored', { error: err });
      throw err;
    }
    finally {
      this.reset();
    }
  }
}

export namespace InterclientAccessFlow {
  /**
   * Params needed to construct an {@link InterclientAccessFlow} instance
   */
  export type Params = {
    /** Must match the `redirect_uri` the native app included when building the `/authorize` URL */
    redirectUri: string | URL;
  };

  export type Init = Params & AuthenticationFlow.Options;

  /** @internal */
  export interface TokenRequestParams extends Omit<Token.TokenRequestParams, 'grantType'> {
    code: string;
    redirectUri: string;
  }

  /** @internal */
  export class TokenRequest extends Token.TokenRequest {
    code: string;
    redirectUri: string;

    constructor (params: TokenRequestParams) {
      const { openIdConfiguration, clientConfiguration } = params;
      super({ openIdConfiguration, clientConfiguration, grantType: 'authorization_code' });
      this.code = params.code;
      this.redirectUri = params.redirectUri;

      this.body.set('redirect_uri', this.redirectUri);
      this.body.set('code', this.code);
      // Intentionally no `code_verifier` — the `/authorize` request was constructed and initiated by
      // the native app without PKCE, since this web app (the party redeeming the code) never generated
      // the corresponding challenge
    }
  }
}