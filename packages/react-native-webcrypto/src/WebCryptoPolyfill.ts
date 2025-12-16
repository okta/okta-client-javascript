import { getWebCryptoNativeBridge } from "./NativeBridge";

function bytesToBase64(bytes: Uint8Array): string {
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
      hashBytes.byteOffset + hashBytes.byteLength
    );
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
        "QuotaExceededError"
      );
    }

    const b64 = bridge.getRandomValues(length);
    const bytes = base64ToBytes(b64);
    new Uint8Array(
      typedArray.buffer,
      typedArray.byteOffset,
      typedArray.byteLength
    ).set(bytes);

    return typedArray;
  };

  g.crypto.randomUUID = () => bridge.randomUUID();
}
