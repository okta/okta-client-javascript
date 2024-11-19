/**
 * @group DPoP
 */
export interface DPoPClaims {
  htm: string;
  htu: string;
  iat: number;
  jti: string;
  nonce?: string;
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

export type ResourceDPoPProofParams = Omit<DPoPProofParams, 'keyPair' | 'nonce'>;
export type DPoPProofTokenRequestParams = Omit<DPoPProofParams, 'accessToken'>;
