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
import { Platform } from '../../platform/Platform.ts';
import { EventEmitter } from '../../utils/EventEmitter.ts';

export { DPoPNonceCache, DPoPStorage };
export type { DPoPHeaders, DPoPClaims, DPoPProofParams };


/**
 * A Platform-level singleton for performing `DPoP` operations. The {@link DPoPSigningAuthority} is
 * reasonable for mangaging `DPoP` key pairs and generate `DPoP` proofs for outgoing {@link !Request}s
 * @group DPoP
 */
export interface DPoPSigningAuthority {
  /**
   * Possible events: {@link DPoPSigningAuthority.Events}
   */
  readonly emitter: EventEmitter<DPoPSigningAuthority.Events>;
  createDPoPKeyPair: () => Promise<string>;
  deleteDPoPKeyPair: (keyPairId: string) => Promise<void>;
  clearDPoPKeyPairs: () => Promise<void>;
  /**
   * Generates a `DPoP` proof for the provided {@link !Request} and writes the `dpop` request header.
   * 
   * @see {@link https://datatracker.ietf.org/doc/html/rfc9449#section-4 | RFC 9449 - DPoP Proof JWTs}
   */
  sign: (request: Request, params: Omit<DPoPProofParams, 'request'>) => Promise<Request>;
}

/**
 * @group DPoP
 */
export namespace DPoPSigningAuthority {
  /**
   * @interface
   * Map of events fired from {@link DPoPSigningAuthority.emitter}
   *
   * @example
   * ```ts
   * // key = Event name
   * // value = Event Type
   * Platform.DPoPSigningAuthority.emitter.on('will_sign_proof', ({ request, claims }) => {
   *   // requests sent to `/proxy/*` are forwarded to the resource server, which will validate `htu`
   *   // against its own url rather than the proxy's
   *   const url = new URL(request.url);
   *   if (url.pathname.startsWith('/proxy/')) {
   *     claims.htu = `https://api.example.com${url.pathname.replace('/proxy', '')}`;
   *   }
   * });
   * ```
   */
  export type Events = {
    /**
     * Fired when a `DPoP` proof fails to be generated. The `error` is re-thrown after this event fires
     */
    'error': { request: Request, error: Error };
    /**
     * Fired before a `DPoP` proof is signed
     *
     * @remarks
     * `claims` are the claims which will be signed. They can be modified (for example, correcting the `htu` claim
     * when requests are routed through a proxy), but modifications must be made **synchronously** within the listener.
     * Listeners are invoked in the order they were registered, subsequent listeners will see the modifications
     * made by previous listeners
     */
    'will_sign_proof': { request: Request, claims: DPoPClaims };
    /**
     * Fired after a `DPoP` proof is signed
     */
    'did_sign_proof': { request: Request, proof: string };
  };
}

/**
 * Default implementation of a DPoP Signing Authority.
 * Signs outgoing network requests with a dpop proof (private key JWT) as well as
 * creates, stores and retrieves the Crypto Key Pairs necessary for the signing operation
 * @group DPoP
 * @internal
 */
export class DPoPSigningAuthorityImpl implements DPoPSigningAuthority {
  /**
   * Possible events: {@link DPoPSigningAuthority.Events}
   */
  readonly emitter: EventEmitter<DPoPSigningAuthority.Events> = new EventEmitter();

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
    const keyPairId = shortID();
    const keyPair = await this.generateKeyPair();
    await this.store.add(keyPairId, keyPair);
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
      iat: Platform.TimeCoordinator.now().value,
      jti: randomBytes(),
      nonce
    };

    // encode access token
    if (accessToken) {
      claims.ath = await hash(accessToken);
    }

    this.emitter.emit('will_sign_proof', { request, claims });
    const proof = await JWT.write(header, claims, dpopKeyPair.privateKey);
    this.emitter.emit('did_sign_proof', { request, proof });
    return proof;
  }

  /**
   * Signs an outgoing network requests with a DPoP proof
   * @param request - outgoing network request to be sign with a DPoP proof
   * @param params - the required component necessary to generate the DPoP proof
   * @returns The provided {@link !Request} with an append `dpop` header
   */
  async sign (request: Request, params: Omit<DPoPProofParams, 'request'>) {
    try {
      const proof = await this.generateDPoPProof({ request, ...params });
      request.headers.set('dpop', proof);
      return request;
    }
    catch (err) {
      if (err instanceof Error) {
        this.emitter.emit('error', { request, error: err });
      }
      throw err;
    }
  }

}
