import type { OpenIdConfiguration } from '../../types';
import type { OAuth2Client } from '../../oauth2/client';


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

  public prepare (): Request {
    const url = new URL(this.url);
    return new Request(url, {
      method: 'POST',
      body: this.body,
      headers: this.headers
    });
  }
}

export namespace OAuth2Request {
  export interface RequestParams {
    openIdConfiguration: OpenIdConfiguration;
    clientConfiguration: OAuth2Client.Configuration;
    clientAuthentication?: any;   // TODO:
  }
}
