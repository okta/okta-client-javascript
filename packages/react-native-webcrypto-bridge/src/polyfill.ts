/**
 * WebCrypto API polyfill for React Native
 * 
 * Uses crypto utilities from @okta/auth-foundation for encoding/decoding
 */

import NativeWebCryptoBridge from './bridge.ts';
import { WebCryptoBridgeError } from './lib.ts';

// NOTE: Does not use `buf` or `b64` from `auth-foundation` because converting
// to a byte array (number[]) makes the bridge code much simplier and avoids
// doing any string encoding in the native code
type ByteArray = number[];

/** 
 * @internal
 * Maps `CryptoKey` instances to the id assigned by the native code
 */
const cryptoKeyMap = new WeakMap<CryptoKey | CryptoKeyPair, string>();

// MARK: - ArryBuffer Converters

/**
 * Converts a `BufferSource` instance to an `ArrayBuffer`
 */
function toArrayBuffer (source: BufferSource): ArrayBuffer {
  if (source instanceof ArrayBuffer) {
    // If it is already an ArrayBuffer, return it directly.
    return source;
  } else if (ArrayBuffer.isView(source)) {
    // If it is an ArrayBufferView (Uint8Array, DataView, Buffer, etc.):
    const typedArray = source;
    
    // For a Node.js Buffer or a standard typed array, the .buffer property
    // gives the underlying ArrayBuffer.
    // Use .slice() to create a *copy* of only the relevant bytes if the view
    // does not span the entire underlying buffer's length. This is crucial for
    // Node.js Buffers which might share a larger memory pool.
    return typedArray.buffer.slice(typedArray.byteOffset, typedArray.byteOffset + typedArray.byteLength);
  } else {
    // Handle other potential cases or throw an error if the type is unexpected
    throw new Error("Unsupported BufferSource type.");
  }
}

/**
 * Convert ArrayBuffer to byte array for native bridge
 */
function arrayBufferToByteArray(buffer: ArrayBuffer): ByteArray {
  return Array.from(new Uint8Array(buffer));
}

/**
 * Convert byte array from native bridge to ArrayBuffer
 */
function byteArrayToArrayBuffer(bytes: ByteArray): ArrayBuffer {
  return new Uint8Array(bytes).buffer;
}

function getCryptoAlg (alg: string) {
  switch (alg) {
    case 'RS256':
      return {
        name: 'RSASSA-PKCS1-v1_5',
        hash: { name: 'SHA-256' }
      };
    default:
      throw new WebCryptoBridgeError('Unknown crypto algorithm', { context: { alg } });
  }
}

// MARK: - SubtleCrypto Methods 

const digest: SubtleCrypto['digest'] = async (algorithm, data) => {
  if (algorithm !== 'SHA-256') {
    throw new WebCryptoBridgeError(`Unsupported algorithm: ${algorithm}`);
  }

  // Convert ArrayBuffer to byte array for native bridge
  const bytes = arrayBufferToByteArray(toArrayBuffer(data));
  const resultBytes = await NativeWebCryptoBridge.digest('SHA-256', bytes);
  return byteArrayToArrayBuffer(resultBytes);
}

const importKey: SubtleCrypto['importKey'] = async (
  format,
  keyData,
  algorithm,
  extractable,
  keyUsages
 ) => {
  if (format !== 'jwk') {
    throw new WebCryptoBridgeError(`Unsupported format: ${format}`);
  }

  const keyDataJson = JSON.stringify(keyData);
  const algorithmJson = JSON.stringify({
    name: algorithm.name,
    hash: algorithm.hash,
  });

  const keyId = await NativeWebCryptoBridge.importKey(
    format,
    keyDataJson,
    algorithmJson,
    extractable,
    keyUsages
  );

  const key: CryptoKey = {
    algorithm,
    extractable,        // TODO: can extractable even be set to `true` and be used in a bridge?
    type: 'public',     // TODO: A string identifying whether the key is a symmetric ('secret') or asymmetric ('private' or 'public') key.
    usages: keyUsages
  };

  cryptoKeyMap.set(key, keyId);

  return key;
};

// TODO: DPoP
const exportKey: SubtleCrypto['exportKey'] = async (format, key) => {
  throw new Error('Not Implemented');
}

// TODO: DPoP
const sign: SubtleCrypto['sign'] = async (algorithm, key, data) => {
  throw new Error('Not Implemented');
}

// TODO: DPoP
const generateKey: SubtleCrypto['generateKey'] = async (
  algorithm, extractable, keyUsages
) => {
  throw new Error('Not Implemented');
}

const verify: SubtleCrypto['verify'] = async (algorithm, key, signature, data) => {
  const keyId = cryptoKeyMap.get(key);
  if (!keyId) {
    throw new WebCryptoBridgeError('Unable to locate key');
  }

  if (algorithm !== 'jwk') {
    throw new WebCryptoBridgeError('Unsupported algorithm');
  }

  const algorithmJson = JSON.stringify(key.algorithm);
  const signatureBytes = arrayBufferToByteArray(toArrayBuffer(signature));
  const dataBytes = arrayBufferToByteArray(toArrayBuffer(data));

  return await NativeWebCryptoBridge.verify(
    algorithmJson,
    keyId,
    signatureBytes,
    dataBytes
  );
}

// MARK: - Types & Exports

/**
 * SubtleCrypto implementation
 */
const subtle: Partial<SubtleCrypto> = {
  digest,
  importKey,
  exportKey,
  sign,
  generateKey,
  verify
};

export interface WebCryptoPolyfill {
  subtle: Partial<SubtleCrypto>;
  getRandomValues: Crypto['getRandomValues']
  randomUUID: Crypto['randomUUID']
}

/**
 * Crypto implementation
 */
const cryptoPolyfill: WebCryptoPolyfill = {
  subtle,
  getRandomValues<T extends ArrayBufferView>(array: T): T {
    const uint8Array = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
    
    const randomBytes = NativeWebCryptoBridge.getRandomValues(uint8Array.length);
    
    for (let i = 0; i < randomBytes.length; i++) {
      uint8Array[i] = randomBytes[i];
    }
    
    return array;
  },
  randomUUID () {
    return NativeWebCryptoBridge.randomUUID();
  }
};

/**
 * Install the WebCrypto polyfill globally
 */
export function installWebCryptoPolyfill(): void {
  if (typeof global !== 'undefined') {
    // @ts-expect-error - Adding crypto to global
    global.crypto = cryptoPolyfill;
  }

  if (typeof window !== 'undefined') {
    // @ts-expect-error - Adding crypto to window
    window.crypto = cryptoPolyfill;
  }
}