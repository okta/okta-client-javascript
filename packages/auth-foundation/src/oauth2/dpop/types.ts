/**
 * @module
 * @mergeModuleWith OAuth2
 */

import type { JsonRecord } from '../../types/index.ts';


/**
 * @group DPoP
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
 * @group DPoP
 */
export interface DPoPHeaders {
  alg: 'RS256',
  typ: 'dpop+jwt',
  jwk: JsonWebKey
}

/**
 * @group DPoP
 */
export interface DPoPProofParams {
  request: Request;
  keyPairId?: string;
  keyPair?: CryptoKeyPair;
  nonce?: string;
  accessToken?: string;
}
