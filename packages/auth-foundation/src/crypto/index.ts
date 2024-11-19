/** @internal */
const encoder = new TextEncoder();
/** @internal */
const decoder = new TextDecoder();

/** @internal */
export function buf(input: string): Uint8Array
export function buf(input: Uint8Array): string
export function buf(input: string | Uint8Array) {
  if (typeof input === 'string') {
    return encoder.encode(input);
  }

  return decoder.decode(input);
}

/** @internal */
const CHUNK_SIZE = 0x8000;
/** @internal */
export function encodeBase64Url(input: Uint8Array | ArrayBuffer) {
  if (input instanceof ArrayBuffer) {
    input = new Uint8Array(input);
  }

  const arr = [];
  for (let i = 0; i < input.byteLength; i += CHUNK_SIZE) {
    // @ts-expect-error - using .apply() confuses TS
    arr.push(String.fromCharCode.apply(null, input.subarray(i, i + CHUNK_SIZE)));
  }
  return btoa(arr.join('')).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

/** @internal */
export function decodeBase64Url(input: string) {
  try {
    const binary = atob(input.replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, ''));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch (err) {
    // TODO:
    // throw new OPE('The input to be decoded is not correctly encoded.', { cause })
  }
}

/** @internal */
export function b64u(input: string): Uint8Array
export function b64u(input: Uint8Array | ArrayBuffer): string
export function b64u(input: string | Uint8Array | ArrayBuffer) {
  if (typeof input === 'string') {
    return decodeBase64Url(input);
  }

  return encodeBase64Url(input);
}

/**
 * @internal
 * @group Crypto
 * @returns SHA-256 hash of input `string`
 */
export async function hash (str: string): Promise<string> {
  return b64u(await crypto.subtle.digest('SHA-256', buf(str)));
}

/**
 * @group Crypto
 * @returns a cryptographically random string
 */
export function randomBytes(): string {
  return b64u(crypto.getRandomValues(new Uint8Array(32)));
}

/**
 * @group Crypto
 * @returns a short, cryptographically random string used for generating `id`s
 */
export function shortID (): string {
  return [...crypto.getRandomValues(new Uint8Array(6))].map(v => v.toString(16)).join('');
}

/**
 * @internal
 * @group Crypto
 * @returns a public/private key pair. The private key will be non-extractable
 */
export async function generateKeyPair (): Promise<CryptoKeyPair> {
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
