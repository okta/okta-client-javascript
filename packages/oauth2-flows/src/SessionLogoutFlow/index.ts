/**
 * @module SessionLogoutFlow
 */

import type { AuthContext } from '../types.ts';
import {
  randomBytes,
  OAuth2Error,
  mergeURLSearchParameters
} from '@okta/auth-foundation';
import OAuth2Client from '@okta/auth-foundation/client';
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
 * - https://developer.okta.com/docs/api/openapi/okta-oauth/oauth/tag/OrgAS/#tag/OrgAS/operation/logoutWithPost
 * - https://openid.net/specs/openid-connect-rpinitiated-1_0.html
 */
export class SessionLogoutFlow extends LogoutFlow {
  readonly client: OAuth2Client;
  readonly logoutRedirectUri: string;
  readonly additionalParameters: Record<string, string>;

  constructor (options: SessionLogoutFlow.InitOptions);
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

  public async start (idToken: string, additionalParameters?: Record<string, string>): Promise<URL>;
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

  export type LogoutParams = {
    logoutRedirectUri: string | URL;
    additionalParameters?: Record<string, string>;
  }

  export type InitOptions = LogoutParams & LogoutFlow.Options;

  export type Result = {
    state?: string;
    logoutRedirectUri?: string;
  }

  export interface Context extends AuthContext {
    idToken: string;
    state: string;
    logoutUrl?: string;
  }
}
