/**
 * @module
 * @mergeModuleWith OAuth2
 */

import type {
  ClientAuthentication,
  APIClientConfiguration,
  JSONSerializable,
  JsonRecord,
  OAuth2Params,
  DiscrimUnion
} from '../types/index.ts';
import { APIClient } from '../http/index.ts';
import { buildURL, hasSameValues } from '../utils/index.ts';
import { validateURL } from '../internals/index.ts';


export type OAuth2ClientConfigurations = DiscrimUnion<OAuth2Params & {
  baseURL: URL | string;
  discoveryURL?: URL | string;
}, 'issuer' | 'baseURL'>;

export type OAuth2ClientOptions = {
  authentication?: ClientAuthentication;
  allowHTTP?: boolean;
}

/**
 * @group Configuration
 * @useDeclaredType
 */
export type ConfigurationParams = OAuth2ClientConfigurations & OAuth2ClientOptions;

/**
 * @group Configuration
 */
export class Configuration extends APIClient.Configuration implements APIClientConfiguration, JSONSerializable {
  public readonly issuer: URL;
  public readonly discoveryURL: URL;
  public readonly clientId: string;
  public scopes: string;
  public authentication: ClientAuthentication = 'none';
  /**
   * When `true`, issuer and other .well-known endpoints can be HTTP. Defaults to `false`
   */
  public allowHTTP: boolean = false;

  public static DefaultOptions: Required<OAuth2ClientOptions> = {
    allowHTTP: false,
    authentication: 'none'
  };

  constructor (params: ConfigurationParams) {
    const {
      baseURL,
      issuer,
      discoveryURL,
      clientId,
      scopes,
      authentication,
      dpop,
      allowHTTP
    } = { ...Configuration.DefaultOptions, ...params };
    if (!validateURL(baseURL, allowHTTP)) {
      throw new TypeError('Invalid baseURL');
    }

    super({ dpop });
    this.issuer = new URL(issuer ?? baseURL);    // one of them must be defined via Discriminated Union
    this.discoveryURL = discoveryURL ? new URL(discoveryURL) : buildURL(this.baseURL, '/.well-known/openid-configuration');
    this.clientId = clientId;
    this.scopes = Array.isArray(scopes) ? scopes.join(' ') : scopes;

    // default values are set in `static DefaultOptions`
    this.authentication = authentication;
    this.allowHTTP = allowHTTP
  }

  /**
   * Alias to {@link issuer} for backwards compatibility
   */
  get baseURL (): URL {
    return this.baseURL;
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
      const s = Array.isArray(scopes) ? scopes : scopes.split(' ');
      matches &&= hasSameValues(s, this.scopes.split(' '));
    }

    return matches;
  }

  toJSON (): JsonRecord {
    const { issuer, discoveryURL, clientId, scopes, authentication, allowHTTP } = this;
    return {
      ...super.toJSON(),
      issuer: issuer.href,
      discoveryURL: discoveryURL.href,
      clientId,
      scopes,
      authentication,
      allowHTTP
    };
  }
}
