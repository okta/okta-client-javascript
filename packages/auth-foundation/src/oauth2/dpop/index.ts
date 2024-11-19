import type { 
  DPoPHeaders,
  DPoPClaims,
  DPoPProofParams,
} from './types';
import { buf, b64u, hash, shortID, randomBytes, generateKeyPair } from '../../crypto';
import { type DPoPStorage, IndexedDBDPoPStore } from './storage';
import TimeCoordinator from '../../utils/TimeCoordinator';

// TODO: how to configure this?
const dpopStorage: DPoPStorage = new IndexedDBDPoPStore();

async function writeJwt (
  header: object,
  claims: object,
  signingKey: CryptoKey
): Promise<string> {
  const head = b64u(buf(JSON.stringify(header)));
  const body = b64u(buf(JSON.stringify(claims)));
  const signature = await crypto.subtle.sign(
    { name: signingKey.algorithm.name }, signingKey, buf(`${head}.${body}`)
  );
  return `${head}.${body}.${b64u(signature)}`;
}

export type { DPoPHeaders, DPoPClaims, DPoPProofParams, };

// export function isDPoPNonceError(obj: any): obj is OAuthError | WWWAuthError {
//   return (
//     (isOAuthError(obj) || isWWWAuthError(obj)) &&
//     obj.errorCode === 'use_dpop_nonce'
//   );
// }

/**
 * Generates a (non-extractable) key pair and writes it to storage, to be used for `DPoP` signatures
 * 
 * @group DPoP
 * @returns `id` representing the generated key pair
 */
export async function createDPoPKeyPair (): Promise<string> {
  // export async function createDPoPKeyPair (): Promise<{keyPair: CryptoKeyPair, keyPairId: string}> {
  const keyPairId = shortID();
  const keyPair = await generateKeyPair();
  await dpopStorage.add(keyPairId, keyPair);
  // return { keyPair, keyPairId };
  return keyPairId;
}

/**
 * Removes a `DPoP` key pair from storage
 * 
 * @group DPoP
 */
export async function deleteDPoPKeyPair (keyPairId: string): Promise<void> {
  return dpopStorage.remove(keyPairId);
}

/**
 * Clears `DPoP` storage of all key pairs
 * 
 * @group DPoP
 */
export async function clearDPoPKeyPairs (): Promise<void> {
  return dpopStorage.clear();
}

/**
 * TODO: Document method
 * 
 * @group DPoP
 * @returns A `DPoP` `JWT` proof for the provided `Request`
 */
export async function generateDPoPProof (params: DPoPProofParams): Promise<string> {
  const { keyPair, keyPairId, request, nonce, accessToken } = params;

  if (!keyPair && !keyPairId) {
    throw new Error('TODO - no dpop PK available');
  }

  // keyPairId cannot be falsey if L40 and keyPair (L45) are falsey
  const dpopKeyPair = keyPair ?? await dpopStorage.get(keyPairId!);
  if (!dpopKeyPair) {
    // TODO: clean up error
    throw new Error('No DPoP PK available');
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
  };

  if (nonce) {
    claims.nonce = nonce;
  }

  // encode access token
  if (accessToken) {
    claims.ath = await hash(accessToken);
  }

  return writeJwt(header, claims, dpopKeyPair.privateKey);
}
