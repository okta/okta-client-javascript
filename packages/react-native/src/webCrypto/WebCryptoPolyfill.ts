import { getWebCryptoNativeBridge } from "./WebCryptoNativeBridge";

export function bytesToBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) {
    s += String.fromCharCode(bytes[i]);
  }

  return globalThis.btoa(s);
}

function base64ToBytes(b64: string): Uint8Array {
  const normalized = b64
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(b64.length / 4) * 4, "=");

  const s = globalThis.atob(normalized);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) {
    out[i] = s.charCodeAt(i);
  }

  return out;
}

function abToBase64(data: ArrayBuffer | ArrayBufferView): string {
  const u8 =
    data instanceof ArrayBuffer
      ? new Uint8Array(data)
      : new Uint8Array(
          data.buffer as ArrayBuffer,
          data.byteOffset,
          data.byteLength,
        );

  return bytesToBase64(u8);
}

function base64ToAb(b64: string): ArrayBuffer {
  const u8 = base64ToBytes(b64);
  const out = new Uint8Array(u8.length);
  out.set(u8);

  return out.buffer;
}

export function moduleWebCryptoPollyfill() {
  const bridge = getWebCryptoNativeBridge();
  const g: any = globalThis as any;

  if (!g.crypto) {
    g.crypto = {};
  }

  if (!g.crypto.subtle) {
    g.crypto.subtle = {};
  }

  g.crypto.subtle.digest = async (alg: any, data: any) => {
    const algoName = typeof alg === "string" ? alg : alg?.name;
    const bytes =
      data instanceof ArrayBuffer
        ? new Uint8Array(data)
        : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);

    const hashB64 = await bridge.digest(algoName, bytesToBase64(bytes));
    const hashBytes = base64ToBytes(hashB64);

    return hashBytes.buffer.slice(
      hashBytes.byteOffset,
      hashBytes.byteOffset + hashBytes.byteLength,
    );
  };

  g.crypto.subtle.generateKey = async (
    algorithm: any,
    extractable: boolean,
    keyUsages: string[],
  ) => {
    const res = await bridge.generateKey(algorithm, extractable, keyUsages);

    return res as any;
  };

  g.crypto.subtle.importKey = async (
    format: string,
    keyData: ArrayBuffer | ArrayBufferView | JsonWebKey,
    algorithm: any,
    extractable: boolean,
    keyUsages: string[],
  ) => {
    let payload: string;

    if (format === "jwk") {
      payload = JSON.stringify(keyData);
    } else {
      payload = abToBase64(keyData as ArrayBuffer | ArrayBufferView);
    }

    const key = await bridge.importKey(
      format as any,
      payload,
      algorithm,
      extractable,
      keyUsages,
    );

    return key as any;
  };

  g.crypto.subtle.sign = async (
    algorithm: any,
    key: any,
    data: ArrayBuffer | ArrayBufferView,
  ) => {
    const dataB64 = abToBase64(data);
    const sigB64 = await bridge.sign(algorithm, key, dataB64);

    return base64ToAb(sigB64);
  };

  g.crypto.getRandomValues = (typedArray: ArrayBufferView) => {
    if (
      !typedArray ||
      typeof typedArray !== "object" ||
      !("byteLength" in typedArray)
    ) {
      throw new TypeError("Expected an instance of ArrayBufferView");
    }

    const length = typedArray.byteLength;
    if (length > 65536) {
      throw new DOMException(
        "The requested length exceeds the maximum allowed (65536 bytes)",
        "QuotaExceededError",
      );
    }

    const b64 = bridge.getRandomValues(length);
    const bytes = base64ToBytes(b64);
    new Uint8Array(
      typedArray.buffer,
      typedArray.byteOffset,
      typedArray.byteLength,
    ).set(bytes);

    return typedArray;
  };

  g.crypto.randomUUID = () => bridge.randomUUID();
}
