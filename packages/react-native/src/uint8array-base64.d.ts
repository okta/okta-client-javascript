export {};

declare global {
  interface Uint8Array {
    setFromBase64(base64: string): void;
    toBase64(options?: {
      alphabet?: "base64" | "base64url";
      omitPaddng?: boolean;
    }): string;
  }

  interface Uint8ArrayConstructor {
    fromBase64(base64: string): Uint8Array;
  }
}
