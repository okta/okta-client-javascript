import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  saveToken (id: string, tokenData: string): Promise<void>;
  getToken (id: string): Promise<string | null>;
  removeToken (id: string): Promise<void>;
  getAllTokenIds (): Promise<Array<string>>;
  clearTokens (): Promise<void>;
  saveMetadata (id: string, metadataData: string): Promise<void>;
  getMetadata (id: string): Promise<string | null>;
  removeMetadata (id: string): Promise<void>;
  setDefaultTokenId (id: string | null): Promise<void>;
  getDefaultTokenId (): Promise<string | null>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('TokenStorageBridge');
