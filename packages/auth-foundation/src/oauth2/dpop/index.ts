import type { DPoPHeaders, DPoPClaims,DPoPProofParams } from './types';
import { b64u, buf, hash, shortID, randomBytes } from '../../crypto';
import { type DPoPStorage, IndexedDBDPoPStore } from './storage';
import TimeCoordinator from '../../utils/TimeCoordinator';

export type { DPoPHeaders, DPoPClaims, DPoPProofParams, };


// TODO: how to configure this?
const dpopStorage: DPoPStorage = new IndexedDBDPoPStore();

// export function isDPoPNonceError(obj: any): obj is OAuthError | WWWAuthError {
//   return (
//     (isOAuthError(obj) || isWWWAuthError(obj)) &&
//     obj.errorCode === 'use_dpop_nonce'
//   );
// }

export interface DPoPSigningAuthority {
  createDPoPKeyPair: () => Promise<string>;
  deleteDPoPKeyPair: (keyPairId: string) => Promise<void>;
  clearDPoPKeyPairs: () => Promise<void>;
  sign: (request: Request, params: Omit<DPoPProofParams, 'request'>) => Promise<Request>;
  cacheNonce: (origin: string, nonce: string) => void;
}

const nonceCache: Map<string, string> = new Map();
function getNonce (origin: string): string | undefined {
  return nonceCache.get(origin);
}
function cacheNonce (origin: string, nonce: string): void {
  nonceCache.set(origin, nonce);
}

/**
 * @internal
 * @group DPoP
 * @returns a public/private key pair. The private key will be non-extractable
 */
async function generateKeyPair (): Promise<CryptoKeyPair> {
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
 * @internal
 * @group DPoP
 * @returns a public/private key pair. The private key will be non-extractable
 */
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
    nonce: getNonce(url.origin),
  };

  // prioritize using the provided nonce
  if (nonce) {
    claims.nonce = nonce;
  }

  // encode access token
  if (accessToken) {
    claims.ath = await hash(accessToken);
  }

  return writeJwt(header, claims, dpopKeyPair.privateKey);
}

async function signRequest (request: Request, params: Omit<DPoPProofParams, 'request'>) {
  const proof = await generateDPoPProof({ request, ...params });
  request.headers.set('dpop', proof);
  return request;
}

export const DefaultDPoPSigningAuthority: DPoPSigningAuthority = {
  createDPoPKeyPair,
  deleteDPoPKeyPair,
  clearDPoPKeyPairs,
  sign: signRequest,
  cacheNonce
};
