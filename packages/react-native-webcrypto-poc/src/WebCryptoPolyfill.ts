import * as Crypto from "expo-crypto";

import {WebCryptoNativeBridgeStub as NativeBridge} from "./NativeBridge"

const toExpoDigestAlgo = (
  algorithm: AlgorithmIdentifier
): Crypto.CryptoDigestAlgorithm => {
  const name =
    typeof algorithm === `string`
      ? algorithm
      : (algorithm as { name: string }).name;

  switch (name.toUpperCase()) {
    case "SHA-256":
      return Crypto.CryptoDigestAlgorithm.SHA256;
    case "SHA-384":
      return Crypto.CryptoDigestAlgorithm.SHA384;
    case "SHA-512":
      return Crypto.CryptoDigestAlgorithm.SHA512;

    default:
      throw new Error(`Unsuported algorithm: ${name}`);
  }
};

export function setupWebCryptoPolyfill(){
  // Avoid re-defining
  // @ts-ignore
  if (typeof global.crypto != "undefined") {
    return;
  }

  // temp polyfill crypto
  // @ts-ignore
  global.crypto = {
    // WebCrypto: crypto.getRandomValues
    // @ts-ignore
    getRandomValues(typedArray: Uint8Array) {
      if (!(typedArray instanceof Uint8Array)) {
        throw new TypeError(
          "getRandomValues: expected Uint8Array instance as argument"
        );
      }

      return NativeBridge.getRandomValues(typedArray);
    },

    // WebCrypto: crypto.randomUUID
    // @ts-ignore
    randomUUID() {
      return NativeBridge.randomUUID();
    },

    // WebCrypto: crypto.subtle.digest
    // @ts-ignore
    subtle: {
      // @ts-ignore
      async digest(
        algorithm: AlgorithmIdentifier,
        data: BufferSource
      ): Promise<ArrayBuffer> {

        const expoAlg = toExpoDigestAlgo(algorithm);
        let bytes: Uint8Array;

        if (data instanceof ArrayBuffer) {
          bytes = new Uint8Array(data);
        } else if (ArrayBuffer.isView(data)) {
          const view = data as ArrayBufferView;
          bytes = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
        } else {
          throw new TypeError(
            "data must be ArrayBuffer or TypedArray"
          );
        }

        return NativeBridge.digest(expoAlg, bytes as any);
      },
    },
  };
}

// auto-run on import
setupWebCryptoPolyfill;()
