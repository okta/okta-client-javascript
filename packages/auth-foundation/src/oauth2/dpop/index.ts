/**
 * @module
 * @mergeModuleWith OAuth2
 */

import type { DPoPHeaders, DPoPClaims, DPoPProofParams } from './types.ts';
import { hash, shortID, randomBytes } from '../../crypto/index.ts';
import { JWT } from '../../jwt/index.ts';
import { DPoPStorage } from './storage.ts';
import { DPoPNonceCache } from './nonceCache.ts';
import { DPoPError } from '../../errors/DPoPError.ts';
import TimeCoordinator from '../../utils/TimeCoordinator.ts';

export { DPoPNonceCache };
export type { DPoPHeaders, DPoPClaims, DPoPProofParams, DPoPStorage };


/**
 * @group DPoP
 * 
 */
export interface DPoPSigningAuthority {
  createDPoPKeyPair: () => Promise<string>;
  deleteDPoPKeyPair: (keyPairId: string) => Promise<void>;
  clearDPoPKeyPairs: () => Promise<void>;
  sign: (request: Request, params: Omit<DPoPProofParams, 'request'>) => Promise<Request>;
}

/**
 * @internal
 * @group DPoP
 * Default implementation of a DPoP Signing Authority.
 * Signs outgoing network requests with a dpop proof (private key JWT) as well as
 * creates, stores and retrieves the Crypto Key Pairs necessary for the signing operation
 *
 */
export class DPoPSigningAuthorityImpl implements DPoPSigningAuthority {
  constructor (private readonly store: DPoPStorage) {}

  /**
   * @internal
   * @group DPoP
   * @returns a public/private key pair. The private key will be non-extractable
   */
  private async generateKeyPair (): Promise<CryptoKeyPair> {
    const algorithm = {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
      modulusLength: 2048,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
    };

    // The "false" here makes it non-exportable
    // https://caniuse.com/mdn-api_subtlecrypto_generatekey
    return crypto.subtle.generateKey(algorithm, false, ['sign', 'verify']);
  }

  /**
   * Generates a (non-extractable) key pair and writes it to storage, to be used for `DPoP` signatures
   *
   * @group DPoP
   * @returns `id` representing the generated key pair
   */
  async createDPoPKeyPair (): Promise<string> {
    // export async function createDPoPKeyPair (): Promise<{keyPair: CryptoKeyPair, keyPairId: string}> {
    const keyPairId = shortID();
    const keyPair = await this.generateKeyPair();
    await this.store.add(keyPairId, keyPair);
    // return { keyPair, keyPairId };
    return keyPairId;
  }

  /**
   * Removes a `DPoP` key pair from storage
   *
   * @group DPoP
   */
  async deleteDPoPKeyPair (keyPairId: string): Promise<void> {
    return this.store.remove(keyPairId);
  }

  /**
   * Clears `DPoP` storage of all key pairs
   *
   * @group DPoP
   */
  async clearDPoPKeyPairs (): Promise<void> {
    return this.store.clear();
  }

  /**
   * TODO: Document method
   *
   * @group DPoP
   * @returns A `DPoP` `JWT` proof for the provided `Request`
   */
  private async generateDPoPProof (params: DPoPProofParams): Promise<string> {
    const { keyPair, keyPairId, request, nonce, accessToken } = params;

    if (!keyPair && !keyPairId) {
      throw new DPoPError('No key pair provided');
    }

    // keyPairId cannot be falsey if L40 and keyPair (L45) are falsey
    const dpopKeyPair = keyPair ?? await this.store.get(keyPairId!);
    if (!dpopKeyPair) {
      throw new DPoPError(`Unable to retrieve key pair: ${keyPairId}`);
    }

    const { kty, crv, e, n, x, y } = await crypto.subtle.exportKey('jwk', dpopKeyPair.publicKey);
    const header: DPoPHeaders = {
      alg: 'RS256',
      typ: 'dpop+jwt',
      jwk: { kty, crv, e, n, x, y }
    };

    const url = new URL(request.url);
    const claims: DPoPClaims = {
      htm: request.method,
      htu: `${url.origin}${url.pathname}`,
      iat: TimeCoordinator.now().value,
      jti: randomBytes(),
      nonce
    };

    // encode access token
    if (accessToken) {
      claims.ath = await hash(accessToken);
    }

    return JWT.write(header, claims, dpopKeyPair.privateKey);
  }

  /**
   * Signs an outgoing network requests with a DPoP proof
   * @param request - outgoing network request to be sign with a DPoP proof
   * @param params - the required component necessary to generate the DPoP proof
   * @returns 
   */
  async sign (request: Request, params: Omit<DPoPProofParams, 'request'>) {
    const proof = await this.generateDPoPProof({ request, ...params });
    request.headers.set('dpop', proof);
    return request;
  }

}

/** @internal */
export const DefaultDPoPSigningAuthority: DPoPSigningAuthority = new DPoPSigningAuthorityImpl(new DPoPStorage.MemoryStore());
