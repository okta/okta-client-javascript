import { getOktaUserAgent } from './oktaUserAgent';
import { mergeHeaders } from '../utils';

export * from './oauth2Request';

export class APIClient {
  readonly configuration: any;

  get baseURL (): URL {
    return this.configuration.baseURL;
  }

  protected async internalFetch  (input: string | URL | Request, init?: RequestInit): Promise<Response> {
    const request = input instanceof Request ? input : new Request(input, init);
    // appends okta user agent
    mergeHeaders(request.headers, { 'X-Okta-User-Agent-Extended': getOktaUserAgent() });
    
    return fetch(request);
  }
}
