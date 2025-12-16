/**
 * @module
 * @mergeModuleWith Core
 */

/** @internal */
const encoder = new TextEncoder();
/** @internal */
const decoder = new TextDecoder();

/** @internal */
export function buf(input: string): ArrayBuffer;
export function buf(input: Uint8Array | ArrayBuffer): string;
export function buf(input: string | Uint8Array | ArrayBuffer) {
  if (typeof input === "string") {
    return encoder.encode(input).buffer;
  }

  if (input instanceof ArrayBuffer) {
    input = new Uint8Array(input);
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
    arr.push(
      String.fromCharCode.apply(null, input.subarray(i, i + CHUNK_SIZE))
    );
  }
  return btoa(arr.join(""))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

/** @internal */
export function decodeBase64Url(input: string) {
  const binary = atob(
    input.replace(/-/g, "+").replace(/_/g, "/").replace(/\s/g, "")
  );
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** @internal */
export function b64u(input: string): ArrayBuffer;
export function b64u(input: Uint8Array | ArrayBuffer): string;
export function b64u(input: string | Uint8Array | ArrayBuffer) {
  if (typeof input === "string") {
    return decodeBase64Url(input).buffer;
  }

  return encodeBase64Url(input);
}

/**
 * @internal
 * @group Crypto
 * @returns SHA-256 hash of input `string`
 */
export async function hash(str: string): Promise<string> {
  return b64u(await crypto.subtle.digest("SHA-256", buf(str)));
}

/**
 * Generates a cryptographically random string
 *
 * @group Crypto
 */
export function randomBytes(): string {
  const foo = crypto.getRandomValues(new Uint8Array(32));

  console.log("foo", foo);

  return b64u(foo);
}

/**
 * Generates a cryptographically random short ID
 *
 * @group Crypto
 */
export function shortID(): string {
  return [...crypto.getRandomValues(new Uint8Array(6))]
    .map((v) => v.toString(16))
    .join("");
}
