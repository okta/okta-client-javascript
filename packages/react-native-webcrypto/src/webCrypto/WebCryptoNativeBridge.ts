export type DigestAlgorithm = "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512";

export type HmacAlgorithm = {
  name: "HMAC";
  hash: { name: Exclude<DigestAlgorithm, "SHA-1"> };
  length?: number;
};

export type EcdsaAlgorithm = {
  name: "ECDSA";
  namedCurved: "P-256" | "P-384" | "P-521";
};

export type RsaPssAlgorithm = {
  name: "RSA-PSS";
  hash: { name: Exclude<DigestAlgorithm, "SHA-1"> };
  saltLength: number;
};

export type RsaPkcs1Algorithm = {
  name: "RSASSA-PKCS1-v1_5";
  hash: { name: Exclude<DigestAlgorithm, "SHA-1"> };
};

export type GenerateKeyAlgorithm =
  | HmacAlgorithm
  | EcdsaAlgorithm
  | (RsaPssAlgorithm & { modulusLength: number; publicExponent: string })
  | (RsaPkcs1Algorithm & { modulusLength: number; publicExponent: string });

export type SignAlgorithm =
  | { name: "HMAC"; hash: { name: Exclude<DigestAlgorithm, "SHA-1"> } }
  | { name: "ECDSA"; hash: { name: Exclude<DigestAlgorithm, "SHA-1"> } }
  | {
      name: "RSA-PSS";
      hash: { name: Exclude<DigestAlgorithm, "SHA-1"> };
      saltLength: number;
    }
  | {
      name: "RSASSA-PKCS1-v1_5";
      hash: { name: Exclude<DigestAlgorithm, "SHA-1"> };
    };

export type ImportKeyFormat = "raw" | "pkcs8" | "spki" | "jwk";

export type NativeCryptoKey = {
  type: "public" | "private" | "secret";
  algorithm: any;
  extractable: boolean;
  usages: string[];
  format: ImportKeyFormat;
  data: string; //base64 for raw/pkcs8/spki or JSON string for jwk
};

export type NativeGenerateKeyResult =
  | NativeCryptoKey
  | { publicKey: NativeCryptoKey; privateKey: NativeCryptoKey };

export interface WebCryptoNativeBridge {
  digest(algorithm: DigestAlgorithm, dataBase24: string): Promise<string>;
  getRandomValues(lenth: number): string;
  randomUUID(): Promise<string>;

  generateKey(
    algorithm: GenerateKeyAlgorithm,
    extractable: boolean,
    keyUsages: string[]
  ): Promise<NativeGenerateKeyResult>;

  importKey(
    format: ImportKeyFormat,
    keyData: string,
    algorithm: any,
    extractable: boolean,
    keyUsages: string[]
  ): Promise<NativeCryptoKey>;

  sign(
    algorithm: SignAlgorithm,
    key: NativeCryptoKey,
    dataBase64: string
  ): Promise<string>;
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
