/**
 * @module
 * @mergeModuleWith OAuth2
 */

import type { OpenIdConfiguration } from '../../types/index.ts';
import type { OAuth2Client } from '../../oauth2/client.ts';
import { APIRequest } from './APIRequest.ts';

/**
 * A builder class for {@link !Request} instances representing a OAuth2 endpoint request
 * @group OAuth2Client
 */
export abstract class OAuth2Request {
  /** HTTP headers for the outgoing request */
  headers: Headers = new Headers();
  /** HTTP body for the outgoing request */
  body: URLSearchParams = new URLSearchParams();
  /** Reference to the OAuth2 Metadata document from the authorization server */
  openIdConfiguration: OpenIdConfiguration;
  /** Configuration of the {@link OAuth2Client} being used to send the request */
  clientConfiguration: OAuth2Client.Configuration;
  /** Authentication setting for the authorization server. Only relevant to Confidental Clients */
  clientAuthentication: any;   // TODO:

  constructor (params: OAuth2Request.RequestParams) {
    this.openIdConfiguration = params.openIdConfiguration;
    this.clientConfiguration = params.clientConfiguration;
    this.clientAuthentication = params.clientAuthentication;
  }

  /** Returns the URL of the request */
  public abstract get url (): string;

  public prepare (context: object = {}): APIRequest {
    const url = new URL(this.url);
    return new APIRequest(url, {
      method: 'POST',
      // calling `.toString()` is required for RN. The default impl of `URLSearchParams` in RN doesn't
      // convert the object to a string body. Calling `.toString()` directly seems to fix the issue
      body: this.body.toString(),
      headers: this.headers,
      context
    });
  }
}

/**
 * @group OAuth2Client
 */
export namespace OAuth2Request {
  export interface RequestParams {
    /** Reference to the OAuth2 Metadata document from the authorization server */
    openIdConfiguration: OpenIdConfiguration;
    /** Configuration of the {@link OAuth2Client} being used to send the request */
    clientConfiguration: OAuth2Client.Configuration;
    /** Authentication setting for the authorization server. Only relevant to Confidental Clients */
    clientAuthentication?: any;   // TODO:
  }
}
