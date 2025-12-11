export interface WebCryptoNativeBridge {
  digest(algorithm: string, data: BufferSource): Promise<ArrayBuffer>;
  getRandomValues(data: Uint8Array): Uint8Array;;
  randomUUID(): string;
}

export const WebCryptoNativeBridgeStub: WebCryptoNativeBridge = {
    async digest(algorithm, data) {
        const algo = algorithm.toUpperCase();

        switch (algo) {
            case "SHA-256":
            case "SHA-384":
            case "SHA-512":
            // handled by polyfill
            break;

            default:
                throw new Error(`Unsuported digest algorithm: ${algorithm}`);
        }
        const {CryptoDigestAlgorithm, digest}  = require("expo-crypto");

        let expoAlg = algo === "SHA-256" ? 
        CryptoDigestAlgorithm.SHA256 
        : algo === "SHA-384" 
        ? CryptoDigestAlgorithm.SHA384 
        : CryptoDigestAlgorithm.SHA512

        return digest(expoAlg, data as any);
    },

    getRandomValues(arr: Uint8Array) {
        const {getRandomValues} = require("expo-crypto");

        return getRandomValues(arr);
    },

    randomUUID() {
        const {randomUUID} = require("expo-crypto");

        return randomUUID();
    }


}