import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';


export interface Spec extends TurboModule {
  /**
   * Generate SHA-256 digest (async).
   * @param data - Standard Base64-encoded input data
   * @returns Standard Base64-encoded digest
   */
  digest(algorithm: string, data: string): Promise<string>;

  /**
   * Generate RSA key pair (async)
   */
  generateKey(
    algorithm: string,
    extractable: boolean,
    keyUsages: string[]
  ): Promise<string>;

  /**
   * Export a key to JWK format (async)
   */
  exportKey(format: string, keyId: string): Promise<string>;

  /**
   * Import a key from JWK format (async)
   */
  importKey(
    format: string,
    keyData: string,
    algorithm: string,
    extractable: boolean,
    keyUsages: string[]
  ): Promise<string>;

  /**
   * Sign data with a private key (async).
   * @param data - Standard Base64-encoded input data
   * @returns Standard Base64-encoded signature
   */
  sign(algorithm: string, keyId: string, data: string): Promise<string>;

  /**
   * Verify a signature (async).
   * @param signature - Standard Base64-encoded signature
   * @param data - Standard Base64-encoded input data
   */
  verify(
    algorithm: string,
    keyId: string,
    signature: string,
    data: string
  ): Promise<boolean>;

  /**
   * Generate cryptographically secure random values (sync).
   * @param length - Number of random bytes to generate
   * @returns Standard Base64-encoded random bytes
   */
  getRandomValues(length: number): string;

  /**
   * Generate a random UUID v4 (sync)
   */
  randomUUID(): string;
}

export default TurboModuleRegistry.getEnforcing<Spec>('WebCryptoBridge');
