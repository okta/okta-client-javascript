import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  /**
   * Generate SHA-256 digest (async)
   */
  digest(algorithm: string, data: number[]): Promise<number[]>;

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
  exportKey(format: string, keyId: string, keyType: string): Promise<string>;

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
   * Sign data with a private key (async)
   */
  sign(algorithm: string, keyId: string, data: number[]): Promise<number[]>;

  /**
   * Verify a signature (async)
   */
  verify(
    algorithm: string,
    keyId: string,
    signature: number[],
    data: number[]
  ): Promise<boolean>;

  /**
   * Generate cryptographically secure random values (sync)
   */
  getRandomValues(length: number): number[];

  /**
   * Generate a random UUID v4 (sync)
   */
  randomUUID(): string;
}

export default TurboModuleRegistry.getEnforcing<Spec>('WebCryptoBridge');