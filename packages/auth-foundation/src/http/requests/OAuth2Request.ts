/**
 * @module
 * @mergeModuleWith OAuth2
 */

import type { OpenIdConfiguration } from '../../types/index.ts';
import type { OAuth2Client } from '../../oauth2/client.ts';
import { APIRequest } from './APIRequest.ts';

/**
 * @group OAuth2Request
 */
export abstract class OAuth2Request {
  headers: Headers = new Headers();
  body: URLSearchParams = new URLSearchParams();
  openIdConfiguration: OpenIdConfiguration;
  clientConfiguration: OAuth2Client.Configuration;
  clientAuthentication: any;   // TODO:

  constructor (params: OAuth2Request.RequestParams) {
    this.openIdConfiguration = params.openIdConfiguration;
    this.clientConfiguration = params.clientConfiguration;
    this.clientAuthentication = params.clientAuthentication;
  }

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
 * @group OAuth2Request
 */
export namespace OAuth2Request {
  export interface RequestParams {
    openIdConfiguration: OpenIdConfiguration;
    clientConfiguration: OAuth2Client.Configuration;
    clientAuthentication?: any;   // TODO:
  }
}
