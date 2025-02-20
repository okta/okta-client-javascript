import type { ClientAuthentication, APIClientConfiguration, Codable, OAuth2Params } from '../types';
import { APIClient } from '../http';
import { buildURL, hasSameValues } from '../utils';

export type ConfigurationParams = {
  baseURL: URL | string;
  clientId: string;
  scopes: string | string[];
  authentication?: ClientAuthentication;
  discoveryURL?: URL | string;
  dpop?: boolean;
};

export class Configuration extends APIClient.Configuration implements APIClientConfiguration, Codable {
  public discoveryURL: URL;
  public clientId: string;
  public scopes: string;
  public authentication: ClientAuthentication = 'none';

  constructor (params: ConfigurationParams) {
    const { baseURL, discoveryURL, clientId, scopes, authentication, dpop } = params;
    super({ baseURL, dpop });
    this.discoveryURL = discoveryURL ? new URL(discoveryURL) : buildURL(this.baseURL, '/.well-known/openid-configuration');
    this.clientId = clientId;
    this.scopes = Array.isArray(scopes) ? scopes.join(' ') : scopes;
    this.authentication = authentication ?? 'none';
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

  toJSON (): Record<string, unknown> {
    const { discoveryURL, clientId, scopes, authentication } = this;
    return {
      ...super.toJSON(),
      discoveryURL: discoveryURL.href,
      clientId,
      scopes,
      authentication
    };
  }
}
