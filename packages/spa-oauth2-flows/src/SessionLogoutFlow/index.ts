import type { SessionLogoutFlowOptions } from './types';
import {
  AuthContext,
  randomBytes,
  OAuth2Error,
  mergeURLSearchParameters
} from '@okta/auth-foundation';
import OAuth2Client from '@okta/auth-foundation/client';

export class SessionLogoutFlow {
  readonly client: OAuth2Client;
  readonly logoutRedirectUri: string;
  readonly additionalParameters: Record<string, string>;

  #inProgress: boolean = false;

  constructor (options: SessionLogoutFlowOptions);
  constructor (client: OAuth2Client, options: SessionLogoutFlowOptions);
  constructor (client: OAuth2Client | SessionLogoutFlowOptions, options?: SessionLogoutFlowOptions) {
    if (client instanceof OAuth2Client) {
      this.client = client;
    }
    else {
      options = client;
      const { issuer, clientId, scopes, dpop } = options;
      this.client = new OAuth2Client({ baseURL: issuer, clientId, scopes, dpop });
    }

    const { logoutRedirectUri, additionalParameters } = options!;

    this.logoutRedirectUri = (new URL(logoutRedirectUri)).href;
    this.additionalParameters = additionalParameters ?? {};
  }

  public get inProgress (): boolean {
    return this.#inProgress;
  }

  // reference: https://github.com/okta/okta-mobile-swift/blob/master/Sources/OktaOAuth2/Authentication/AuthorizationCodeFlow.swift#L128
  private set inProgress (inProgress: boolean) {
    this.#inProgress = inProgress;
    if (inProgress) {
      // TODO: emit authenticationStarted
    }
    else {
      // TODO: emit authenticationFinished
    }
  }

  private buildLogoutURL (url: string, context: SessionLogoutFlow.Context, additionalParameters: Record<string, string>) {
    let logoutUrl: URL | undefined;
    try {
      logoutUrl = new URL(url);
    }
    catch (err) {
      throw new OAuth2Error('invalid url (logoutUrl)');
    }

    try {
      logoutUrl.searchParams.set('id_token_hint', context.idToken);
      logoutUrl.searchParams.set('post_logout_redirect_uri', this.logoutRedirectUri);
      logoutUrl.searchParams.set('state', context.state);

      // TODO: if prompt is defined?

      mergeURLSearchParameters(logoutUrl.searchParams, this.additionalParameters);
      mergeURLSearchParameters(logoutUrl.searchParams, additionalParameters);

      return logoutUrl;
    }
    catch(err) {
      console.log(err);
      throw new OAuth2Error('cannot compose url (logoutUrl)');
    }
  }

  async start (idToken: string, additionalParameters?: Record<string, string>): Promise<URL>;
  async start (context: SessionLogoutFlow.Context, additionalParameters?: Record<string, string>): Promise<URL>;
  async start (idToken: string | SessionLogoutFlow.Context, additionalParameters: Record<string, string> = {}): Promise<URL> {
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

    this.inProgress = true;

    try {
      const openIdConfig = await this.client.openIdConfiguration();

      if (!openIdConfig.end_session_endpoint) {
        throw new OAuth2Error('Missing `end_session_endpoint` from ./well-known config');
      }

      console.log('context: ', context);
      const url = this.buildLogoutURL(openIdConfig.end_session_endpoint, context, additionalParameters);
      context.logoutUrl = url.href;

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

  reset () {
    this.inProgress = false;
  }

}

export namespace SessionLogoutFlow {

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
