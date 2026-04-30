/**
 * WebCrypto API polyfill for React Native
 *
 * Bridges JavaScript WebCrypto API calls to native platform cryptography
 * (Apple Security / Android JCA) via a React Native TurboModule.
 *
 * Binary data crosses the bridge as standard Base64 strings for efficiency.
 */

import NativeWebCryptoBridge from './NativeWebCryptoBridge.ts';


/**
 * @internal
 * Maps `CryptoKey` instances to the id assigned by the native code
 */
const cryptoKeyMap = new WeakMap<CryptoKey | CryptoKeyPair, string>();

// MARK: - ArrayBuffer ↔ Base64 Converters

/**
 * Converts a `BufferSource` instance to an `ArrayBuffer`
 */
function toArrayBuffer(source: BufferSource): ArrayBuffer {
  if (source instanceof ArrayBuffer) {
    return source;
  } else if (ArrayBuffer.isView(source)) {
    const typedArray = source;
    // .slice() creates a copy of only the relevant bytes. This is crucial for
    // Node.js Buffers which might share a larger memory pool.
    return typedArray.buffer.slice(typedArray.byteOffset, typedArray.byteOffset + typedArray.byteLength);
  } else {
    throw new TypeError('Unsupported BufferSource type');
  }
}

/**
 * Encode an ArrayBuffer to a standard Base64 string for the native bridge.
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Decode a standard Base64 string from the native bridge to an ArrayBuffer.
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// MARK: - SubtleCrypto Methods

const digest: SubtleCrypto['digest'] = async (algorithm, data) => {
  if (algorithm !== 'SHA-256') {
    throw new DOMException(`Unsupported algorithm: ${algorithm}`, 'NotSupportedError');
  }

  const base64Data = arrayBufferToBase64(toArrayBuffer(data));
  const resultBase64 = await NativeWebCryptoBridge.digest('SHA-256', base64Data);
  return base64ToArrayBuffer(resultBase64);
};

const importKey: SubtleCrypto['importKey'] = async (
  format,
  keyData,
  algorithm,
  extractable,
  keyUsages
) => {
  if (format !== 'jwk') {
    throw new DOMException(`Unsupported format: ${format}`, 'NotSupportedError');
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
    extractable,
    type: 'public',     // TODO: Determine from key data when private key import is supported
    usages: keyUsages
  };

  cryptoKeyMap.set(key, keyId);

  return key;
};

// TODO: DPoP — wire to native implementation when ready
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const exportKey: SubtleCrypto['exportKey'] = async (_format, _key) => {
  throw new DOMException('exportKey is not yet implemented', 'NotSupportedError');
};

// TODO: DPoP — wire to native implementation when ready
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const sign: SubtleCrypto['sign'] = async (_algorithm, _key, _data) => {
  throw new DOMException('sign is not yet implemented', 'NotSupportedError');
};

// TODO: DPoP — wire to native implementation when ready
const generateKey: SubtleCrypto['generateKey'] = async (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _algorithm, _extractable, _keyUsages
) => {
  throw new DOMException('generateKey is not yet implemented', 'NotSupportedError');
};

const verify: SubtleCrypto['verify'] = async (algorithm, key, signature, data) => {
  const keyId = cryptoKeyMap.get(key);
  if (!keyId) {
    throw new DOMException('Unable to locate key', 'InvalidAccessError');
  }

  const alg = typeof algorithm === 'string' ? algorithm : algorithm.name;
  if (alg !== 'RSASSA-PKCS1-v1_5') {
    throw new DOMException('Unsupported algorithm', 'NotSupportedError');
  }

  if (!key.usages.includes('verify')) {
    throw new DOMException('Key does not support verify operation', 'InvalidAccessError');
  }

  const algorithmJson = JSON.stringify(key.algorithm);
  const signatureBase64 = arrayBufferToBase64(toArrayBuffer(signature));
  const dataBase64 = arrayBufferToBase64(toArrayBuffer(data));

  return await NativeWebCryptoBridge.verify(
    algorithmJson,
    keyId,
    signatureBase64,
    dataBase64
  );
};

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
  getRandomValues: Crypto['getRandomValues'];
  randomUUID: Crypto['randomUUID'];
}

/**
 * Crypto implementation
 */
const cryptoPolyfill: WebCryptoPolyfill = {
  subtle,
  getRandomValues<T extends ArrayBufferView>(array: T): T {
    const uint8Array = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
    const requestedLength = uint8Array.length;

    const base64Result = NativeWebCryptoBridge.getRandomValues(requestedLength);

    // Decode the Base64 string from the native bridge
    const binary = atob(base64Result);
    if (binary.length !== requestedLength) {
      throw new DOMException(
        `getRandomValues: expected ${requestedLength} bytes, received ${binary.length}`,
        'OperationError'
      );
    }

    for (let i = 0; i < binary.length; i++) {
      uint8Array[i] = binary.charCodeAt(i);
    }

    return array;
  },
  randomUUID() {
    return NativeWebCryptoBridge.randomUUID() as ReturnType<Crypto['randomUUID']>;
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
