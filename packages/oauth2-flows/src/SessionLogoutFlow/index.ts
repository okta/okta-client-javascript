/**
 * @module SessionLogoutFlow
 */

import type { AuthContext } from '../types.ts';
import {
  OAuth2Client,
  randomBytes,
  OAuth2Error,
  mergeURLSearchParameters
} from '@okta/auth-foundation/core';
import { LogoutFlow } from '../LogoutFlow.ts';


/**
 * An implementation of OIDC logout
 * 
 * @example
 * ```typescript
 * const client = new OAuth2Client(params);
 * const signOutFlow = new SessionLogoutFlow(client, {
 *   logoutRedirectUri: `${window.location.origin}/logout`
 * });
 * 
 * await clearDPoPKeyPairs();   // OPTIONAL
 * 
 * const signOutUrl = await signOutFlow.start();
 * window.location.assign(signOutUrl);
 * ```
 * 
 * @see
 * * {@link https://developer.okta.com/docs/api/openapi/okta-oauth/oauth/tag/OrgAS/#tag/OrgAS/operation/logoutWithPost | Okta Documentation}
 * * {@link https://openid.net/specs/openid-connect-rpinitiated-1_0.html | OIDC RP-Initiated Logout 1.0}
 */
export class SessionLogoutFlow extends LogoutFlow {
  readonly client: OAuth2Client;
  readonly logoutRedirectUri: string;
  readonly additionalParameters: Record<string, string>;

  /** Constructs a new {@link OAuth2Client} internally from `options` */
  constructor (options: SessionLogoutFlow.InitOptions);
  /** Uses an existing {@link OAuth2Client} instance */
  constructor (client: OAuth2Client, options: SessionLogoutFlow.LogoutParams);
  constructor (
    client: OAuth2Client | SessionLogoutFlow.InitOptions,
    options?: SessionLogoutFlow.InitOptions | SessionLogoutFlow.LogoutParams
  ) {
    super();
    if (client instanceof OAuth2Client) {
      this.client = client;
    }
    else {
      const { issuer, logoutRedirectUri, additionalParameters, ...oauth2Params } = client;
      this.client = new OAuth2Client({ baseURL: issuer, ...oauth2Params });
      options = { logoutRedirectUri, additionalParameters };
    }

    const { logoutRedirectUri, additionalParameters } = options as SessionLogoutFlow.LogoutParams;

    this.logoutRedirectUri = (new URL(logoutRedirectUri)).href;
    this.additionalParameters = additionalParameters ?? {};
  }

  /** @internal */
  private buildLogoutURL (url: string, context: SessionLogoutFlow.Context, additionalParameters: Record<string, string>) {
    let logoutUrl = new URL(url);

    logoutUrl.searchParams.set('id_token_hint', context.idToken);
    logoutUrl.searchParams.set('post_logout_redirect_uri', this.logoutRedirectUri);
    logoutUrl.searchParams.set('state', context.state);

    // TODO: if prompt is defined?

    mergeURLSearchParameters(logoutUrl.searchParams, this.additionalParameters);
    mergeURLSearchParameters(logoutUrl.searchParams, additionalParameters);

    return logoutUrl;
  }

  /**
   * Initiates a logout using just an ID token
   * @param idToken - The ID token to be passed as `id_token_hint`
   * @param additionalParameters - **Optional.** A map of URL query parameters to be added to the `/logout` request
   * @returns A {@link https://developer.mozilla.org/en-US/docs/Web/API/URL/URL | URL} instance representing `Authorization Server` `/logout`
   * with all required query parameters
   */
  public async start (idToken: string, additionalParameters?: Record<string, string>): Promise<URL>;
  /**
   * Initiates a logout using an explicit {@link SessionLogoutFlow.Context}
   * @param context - {@link SessionLogoutFlow.Context} describing the logout request
   * @param additionalParameters - **Optional.** A map of URL query parameters to be added to the `/logout` request
   * @returns A {@link https://developer.mozilla.org/en-US/docs/Web/API/URL/URL | URL} instance representing `Authorization Server` `/logout`
   * with all required query parameters
   */
  public async start (context: SessionLogoutFlow.Context, additionalParameters?: Record<string, string>): Promise<URL>;
  public async start (idToken: string | SessionLogoutFlow.Context, additionalParameters: Record<string, string> = {}): Promise<URL> {
    let context: SessionLogoutFlow.Context;
    if (typeof idToken === 'string') {
      context = {
        state: randomBytes(),
        idToken
      };
    }
    else {
      context = idToken;
    }
    context.state ??= randomBytes();    // ensures state value is defined

    this.startFlow();

    try {
      const openIdConfig = await this.client.openIdConfiguration();

      if (!openIdConfig.end_session_endpoint) {
        throw new OAuth2Error('Missing `end_session_endpoint` from ./well-known config');
      }

      const url = this.buildLogoutURL(openIdConfig.end_session_endpoint, context, additionalParameters);
      context.logoutUrl = url.href;

      return url;
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

export namespace SessionLogoutFlow {

  /**
   * Params needed when constructing a {@link SessionLogoutFlow} from an existing {@link AuthFoundation!OAuth2Client}
   */
  export type LogoutParams = {
    /** Where the Authorization Server should redirect back to once logout completes */
    logoutRedirectUri: string | URL;
    /** Additional query parameters to include on the `/logout` request */
    additionalParameters?: Record<string, string>;
  }

  /**
   * Options required to construct a {@link SessionLogoutFlow} instance
   * @interface
   */
  export type InitOptions = LogoutParams & LogoutFlow.Options;

  /**
   * Values needed to initiate a session logout
   * 
   * @see {@link https://openid.net/specs/openid-connect-rpinitiated-1_0.html#RPLogout | OIDC: RP-Initiated Logout}
   */
  export interface Context extends AuthContext {
    /**
     * The ID token to be passed as `id_token_hint`
     * @see {@link https://openid.net/specs/openid-connect-rpinitiated-1_0.html#RPLogout | OIDC: RP-Initiated Logout}
     */
    idToken: string;
    /**
     * A unique value used to correlate the `/logout` request with its redirect back
     * @see {@link https://openid.net/specs/openid-connect-rpinitiated-1_0.html#RPLogout | OIDC: RP-Initiated Logout}
     */
    state: string;
    /**
     * The resolved `/logout` URL; set once {@link SessionLogoutFlow.start} builds it
     * @see {@link https://openid.net/specs/openid-connect-rpinitiated-1_0.html#RPLogout | OIDC: RP-Initiated Logout}
     */
    logoutUrl?: string;
  }
}
