import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  // Token operations (secure storage)
  saveToken (id: string, tokenData: string): Promise<void>;
  getToken (id: string): Promise<string | null>;
  removeToken (id: string): Promise<void>;
  getAllTokenIds (): Promise<string[]>;
  clearTokens (): Promise<void>;

  // Metadata operations (regular storage)
  saveMetadata (id: string, metadataData: string): Promise<void>;
  getMetadata (id: string): Promise<string | null>;
  removeMetadata (id: string): Promise<void>;

  // Default token ID
  setDefaultTokenId (id: string | null): Promise<void>;
  getDefaultTokenId (): Promise<string | null>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('TokenStorageBridge');
