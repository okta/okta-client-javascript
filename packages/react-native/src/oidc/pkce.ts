import {
  moduleWebCryptoPollyfill,
  bytesToBase64,
} from "../webCrypto/WebCryptoPolyfill";

function toBase64Url(bytes: Uint8Array) {
  return bytesToBase64(bytes)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export async function createPkcePair() {
  moduleWebCryptoPollyfill();

  const random = new Uint8Array(32);
  globalThis.crypto.getRandomValues(random);

  const codeVerifier = toBase64Url(random);

  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);

  const digest = await globalThis.crypto.subtle.digest("SHA-256", data);
  const hashBytes = new Uint8Array(digest);

  const codeChallenge = toBase64Url(hashBytes);

  return {
    codeVerifier,
    codeChallenge,
    codeChallengeMethod: "S256" as const,
  };
}
