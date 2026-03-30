import type { TurboModule } from 'react-native';
import { TurboModuleRegistry, NativeModules, Platform } from 'react-native';

export interface Spec extends TurboModule {
  saveToken(id: string, tokenData: string): Promise<void>;
  getToken(id: string): Promise<string | null>;
  removeToken(id: string): Promise<void>;
  getAllTokenIds(): Promise<Array<string>>;
  clearTokens(): Promise<void>;
  saveMetadata(id: string, metadataData: string): Promise<void>;
  getMetadata(id: string): Promise<string | null>;
  removeMetadata(id: string): Promise<void>;
  setDefaultTokenId(id: string | null): Promise<void>;
  getDefaultTokenId(): Promise<string | null>;
}

console.log('fetching fetching tokenstorage module');

// Check what's available
console.log('NativeModules keys:', Object.keys(NativeModules));
console.log('Direct access NativeModules.TokenStorageBridge:', NativeModules.TokenStorageBridge);

const isTurboModuleEnabled = global.__turboModuleProxy != null;
console.log('TurboModule enabled?', isTurboModuleEnabled);

let module: Spec | null = null;

// Try TurboModule first
if (isTurboModuleEnabled) {
  try {
    module = TurboModuleRegistry.get<Spec>('TokenStorageBridge');
    console.log('Got from TurboModuleRegistry:', module);
  } catch (e) {
    console.warn('TurboModuleRegistry.get failed:', e);
  }
}

// Fallback to legacy NativeModules
if (!module) {
  console.log('Trying NativeModules fallback...');
  module = NativeModules.TokenStorageBridge;
  console.log('Got from NativeModules:', module);
}

if (!module) {
  console.log('is fallback');
  throw new Error(
    `TokenStorageBridge not found!\n` +
    `Platform: ${Platform.OS}\n` +
    `TurboModules: ${isTurboModuleEnabled}\n` +
    `Available: ${Object.keys(NativeModules).join(', ')}`
  );
}

console.log('✅ Successfully loaded TokenStorageBridge:', module);

export default module as Spec;