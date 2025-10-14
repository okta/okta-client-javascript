/**
 * @module
 * @mergeModuleWith OAuth2
 */

import type { JWK, JWKS } from '../jwt/index.ts';
import type { ConfigurationParams } from '../oauth2/configuration.ts';
// moved to separate file because it's so large
import type { OpenIdConfiguration } from './openid.ts';

/**
 * JSON format of an error response from an OAuth2 server
 * 
 * @group Types
 */
export interface OAuth2ErrorResponse {
  readonly error: string
  readonly errorDescription?: string
  readonly error_description?: string
  readonly errorUri?: string
  readonly error_uri?: string

  // readonly algs?: string
  // readonly scope?: string

  // readonly [parameter: string]: JsonValue | undefined
}


/**
 * Predicate for {@link OAuth2ErrorResponse}
 * 
 * @group Types
 */
// TODO: move location?
export function isOAuth2ErrorResponse (input: unknown): input is OAuth2ErrorResponse {
  if (typeof input === 'object' && (input as OAuth2ErrorResponse).error) {
    return true;
  }
  return false;
}

export { OpenIdConfiguration };
/**
 * Predicate for {@link OpenIdConfiguration}
 * 
 * @group Types
 */
export function isOpenIdConfiguration (input: unknown): input is OpenIdConfiguration {
  if (typeof input === 'object' && (input as OpenIdConfiguration).issuer) {
    return true;
  }
  return false;
}

/**
 * Predicate for {@link Core.JWK | JWK}
 * 
 * @group Types
 */
export function isJWK (input: unknown): input is JWK {
  if (typeof input === 'object') {
    const obj = input as JWK;
    if (obj.alg && obj.kid) {
      return true;
    }
  }
  return false;
}

/**
 * Predicate for {@link Core.JWKS | JWKS}
 * 
 * @group Types
 */
export function isJWKS (input: unknown): input is JWKS {
  if (Array.isArray(input) && input.every(ele => isJWK(ele))) {
    return true;
  }
  return false;
}

export type { ConfigurationParams };

/**
 * Parameters needed to define an OAuth2 flow
 *
 * @group Types
 */
export type OAuth2Params = {
  issuer?: string | URL;
  clientId?: string;
  scopes?: string[];
};

/**
 * Possible values of `grant_type` for a `/token` request
 * 
 * @group Types
 */
export type GrantType = 'authorization_code' | 'refresh_token';

/**
 * Possible values of `token_type` from a `/token` response
 * 
 * @group Types
 */
export type TokenType = 'Bearer' | 'DPoP';

/**
 * Possible values of {@link OAuth2.Configuration.authentication} property.
 * Determines how the {@link OAuth2Client} will sign OAuth2 requests
 * 
 * @group Types
 */
export type ClientAuthentication = 'none';

// TODO: revisit (name, location)
export interface APIClientConfiguration {
  readonly baseURL: URL;
}

/**
 * Possible types of `acr_values` for OAuth2 requests
 * 
 * @group Types
 */
export type AcrValues = string | string[];

/**
 * Possible `acr_values` of Okta Authorization Servers
 * 
 * @group Types
 * 
 * @see
 * https://developer.okta.com/docs/api/openapi/okta-oauth/oauth/tag/OrgAS/#tag/OrgAS/operation/authorize!in=query&path=acr_values&t=request
 */
// TODO: move this to enum or constant?
export type OktaAcrValues =
  /**
   * Phishing-Resistant
   */
  'phr' |
  /**
   * Phishing-Resistant Hardware-Protected
   */
  'phrh' |
  /**
   * Any one factor
   */
  'urn:okta:loa:1fa:any' |
  /**
   * Password only
   */
  'urn:okta:loa:1fa:pwd' |
  /**
   * Any two factors
   */
  'urn:okta:loa:2fa:any' |
  /**
   * Any two factors, if possible. Any two factors are presented only if the user is enrolled, otherwise any one factor is presented.
   */
  'urn:okta:loa:2fa:any:ifpossible';
