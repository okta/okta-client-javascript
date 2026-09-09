/**
 * @module
 * @mergeModuleWith OAuth2
 */

import type { JsonRecord } from '../../types/index.ts';


/**
 * `JWT` claims associated with a `DPoP` proof 
 * @group DPoP
 * 
 * @see {@link https://datatracker.ietf.org/doc/html/rfc9449#section-4.2-3 | RFC 9499 - DPoP Proof Claims}
 */
export interface DPoPClaims extends JsonRecord {
  /**
   * (http) request method (verb)
   */
  htm: string;
  /**
   * (http) request url
   */
  htu: string;
  /**
   * issued at (timestamp)
   */
  iat: number;
  /**
   * unique identifier
   */
  jti: string;
  /**
   * nonce value (provided by dpop-nonce header)
   */
  nonce?: string;
  /**
   * access token hash
   */
  ath?: string;
}

/**
 * `JWT` header parameters for a `DPoP` proof
 * @group DPoP
 * 
 * @see {@link https://datatracker.ietf.org/doc/html/rfc9449#section-4.2-1 | RFC 9499 - DPoP Proof Header}
 */
export interface DPoPHeaders {
  alg: 'RS256',
  typ: 'dpop+jwt',
  jwk: JsonWebKey
}

/**
 * Parameters required to generate a `DPoP` proof
 * @group DPoP
 */
export interface DPoPProofParams {
  request: Request;
  keyPairId?: string;
  keyPair?: CryptoKeyPair;
  nonce?: string;
  accessToken?: string;
}
