type DigestAlgorithm = "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512";

export interface WebCryptoNativeBridge {
  digest(algorithm: DigestAlgorithm, dataBase24: string): Promise<string>;
  getRandomValues(lenth: number): string;
  randomUUID(): Promise<string>;
}

function getNativeModules(): any {
  const rn = require("react-native");
  return rn.NativeModules;
}

export function getWebCryptoNativeBridge(): WebCryptoNativeBridge {
  const NativeModules = getNativeModules();

  const mod = NativeModules?.WebCryptoNativeBridge as
    | WebCryptoNativeBridge
    | undefined;

  if (!mod) {
    throw new Error("Native module WebCryptoNativeBridge not found");
  }

  return mod;
}
