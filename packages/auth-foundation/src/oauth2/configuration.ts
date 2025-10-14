/**
 * @module
 * @mergeModuleWith OAuth2
 */

import type {
  ClientAuthentication,
  APIClientConfiguration,
  JSONSerializable,
  JsonRecord,
  OAuth2Params
} from '../types/index.ts';
import { APIClient } from '../http/index.ts';
import { buildURL, hasSameValues } from '../utils/index.ts';
import { validateURL } from '../internals/index.ts';


/**
 * @group Configuration
 */
export type ConfigurationParams = {
  baseURL: URL | string;
  clientId: string;
  scopes: string | string[];
  authentication?: ClientAuthentication;
  discoveryURL?: URL | string;
  dpop?: boolean;
  allowHTTP?: boolean;
};

/**
 * @group Configuration
 */
export class Configuration extends APIClient.Configuration implements APIClientConfiguration, JSONSerializable {
  public baseURL: URL;
  public discoveryURL: URL;
  public clientId: string;
  public scopes: string;
  public authentication: ClientAuthentication = 'none';
  /**
   * When `true`, issuer and other .well-known endpoints can be HTTP. Defaults to `false`
   */
  public allowHTTP: boolean = false;

  constructor (params: ConfigurationParams) {
    const { baseURL, discoveryURL, clientId, scopes, authentication, dpop, allowHTTP } = params;
    if (!validateURL(baseURL, allowHTTP)) {
      throw new TypeError('Invalid baseURL');
    }

    super({ dpop });
    this.baseURL = new URL(baseURL);
    this.discoveryURL = discoveryURL ? new URL(discoveryURL) : buildURL(this.baseURL, '/.well-known/openid-configuration');
    this.clientId = clientId;
    this.scopes = Array.isArray(scopes) ? scopes.join(' ') : scopes;
    this.authentication = authentication ?? 'none';
    this.allowHTTP = allowHTTP ?? false;
  }

  matches (params: OAuth2Params): boolean {
    const { issuer, clientId, scopes } = params;

    // special case, don't return true when no actual params were provided to compare against
    if (Object.keys(params).length === 0) {
      return false;
    }

    let matches = true;
    if (issuer) {
      matches &&= new URL(issuer).href === this.baseURL.href;
    }

    if (clientId) {
      matches &&= clientId === this.clientId;
    }

    if (scopes) {
      matches &&= hasSameValues(scopes, this.scopes.split(' '));
    }

    return matches;
  }

  toJSON (): JsonRecord {
    const { baseURL, discoveryURL, clientId, scopes, authentication } = this;
    return {
      ...super.toJSON(),
      baseURL: baseURL.href,
      discoveryURL: discoveryURL.href,
      clientId,
      scopes,
      authentication
    };
  }
}
