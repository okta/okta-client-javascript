import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export type BrowserSessionResult =  {
  type: 'success';
  url: string;
} | {
  type: 'cancel' | 'dismiss';
}

export interface BrowserOpenResult {
  type: 'opened' | 'error';
}

export type BrowserSessionOptions = {
  ephemeralSession: boolean;
};

export interface Spec extends TurboModule {
  // iOS: Launches ASWebAuthenticationSession and waits for OAuth result
  openAuthSession(url: string, redirectScheme: string, options: BrowserSessionOptions): Promise<BrowserSessionResult>;
  
  // Android: Launches CustomTabsIntent and returns immediately
  openBrowser(url: string, options: BrowserSessionOptions): Promise<BrowserOpenResult>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('BrowserSessionBridge');
