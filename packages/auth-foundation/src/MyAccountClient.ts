import { FetchClient } from './FetchClient';
import { TokenOrchestrator } from './TokenOrchestrator';


/**
 * Under Construction
 */
export class MyAccountClient {
  fetcher: FetchClient;
  baseURL: URL;

  constructor (orgURL: URL | string, orchestrator: TokenOrchestrator) {
    this.baseURL = new URL(orgURL);
    this.fetcher = new FetchClient(orchestrator);

    // required to avoid 406 errors from API
    this.fetcher.defaultHeaders = { Accept: 'application/json;okta-version=1.0' };
  }

  async makeRequest (path: string, init: Parameters<FetchClient['fetch']>[1]  = {}) {
    const url = new URL(`/idp/myaccount${path}`, this.baseURL);
    const response = await this.fetcher.fetch(url, init);

    if (!response.ok) {
      throw new Error('TODO')
    }

    return await response.json();
  }

  // https://developer.okta.com/docs/api/openapi/okta-myaccount/myaccount/tag/Profile/
  async getProfile () {
    return this.makeRequest('/profile', { scopes: ['okta.myAccount.profile.read'] });
  }
}
