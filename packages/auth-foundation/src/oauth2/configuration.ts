import type { ClientAuthentication, APIClientConfiguration, Codable } from '../types';
import { mCodable } from '../mixins/Codable';
import { buildURL } from '../utils';

export type ConfigurationParams = {
  baseURL: URL | string;
  clientId: string;
  scopes: string | string[];
  authentication?: ClientAuthentication;
  discoveryURL?: URL | string;
  dpop?: boolean;
};

export class Configuration extends mCodable(
  class Configuration {   // Base class before mixins are applied
    public baseURL: URL;
    public discoveryURL: URL;
    public clientId: string;
    public scopes: string;
    public authentication: ClientAuthentication = 'none';
    public dpop: boolean = false;

    constructor (params: ConfigurationParams) {
      const { baseURL, discoveryURL, clientId, scopes, authentication, dpop } = params;
      // TODO: add some validation for baseURL to ensure it is a valid url
      this.baseURL = new URL(baseURL);
      this.discoveryURL = discoveryURL ? new URL(discoveryURL) : buildURL(this.baseURL, '/.well-known/openid-configuration');
      this.clientId = clientId;
      this.scopes = Array.isArray(scopes) ? scopes.join(' ') : scopes;
      this.authentication = authentication ?? 'none';
      this.dpop = dpop ?? false;
    }

    toJSON (): Record<string, unknown> {
      const { baseURL, discoveryURL, clientId, scopes, authentication, dpop } = this;
      return {
        baseURL: baseURL.href,
        discoveryURL: discoveryURL.href,
        clientId,
        scopes,
        authentication,
        dpop
      };
    }
  }
) implements APIClientConfiguration, Codable {}
