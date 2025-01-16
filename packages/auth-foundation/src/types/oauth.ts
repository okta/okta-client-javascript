import type { JWK, JWKS } from '../jwt';
import type { ConfigurationParams } from '../oauth2/configuration';
// moved to separate file because it's so large
import type { OpenIdConfiguration } from './openid';

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

// TODO: move location?
export function isOAuth2ErrorResponse (input: unknown): input is OAuth2ErrorResponse {
  if (typeof input === 'object' && (input as OAuth2ErrorResponse).error) {
    return true;
  }
  return false;
}

export { OpenIdConfiguration };
export function isOpenIdConfiguration (input: unknown): input is OpenIdConfiguration {
  if (typeof input === 'object' && (input as OpenIdConfiguration).issuer) {
    return true;
  }
  return false;
}

export function isJWK (input: unknown): input is JWK {
  if (typeof input === 'object') {
    const obj = input as JWK;
    if (obj.alg && obj.kid) {
      return true;
    }
  }
  return false;
}

export function isJWKS (input: unknown): input is JWKS {
  if (Array.isArray(input) && input.every(ele => isJWK(ele))) {
    return true;
  }
  return false;
}

export type { ConfigurationParams };

export type GrantType = 'authorization_code' | 'refresh_token';

export type TokenType = 'Bearer' | 'DPoP';

export type ClientAuthentication = 'none';

// TODO: revisit (name, location)
export interface APIClientConfiguration {
  readonly baseURL: URL;
}
