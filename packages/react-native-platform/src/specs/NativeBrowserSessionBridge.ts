import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface BrowserSessionResult {
  type: 'success' | 'cancel' | 'dismiss';
  url?: string;
}

export interface BrowserOpenResult {
  type: 'opened' | 'error';
}

export interface Spec extends TurboModule {
  // iOS: Launches ASWebAuthenticationSession and waits for OAuth result
  openAuthSession(url: string, redirectScheme: string): Promise<BrowserSessionResult>;
  
  // Android: Launches CustomTabsIntent and returns immediately
  openBrowser(url: string): Promise<BrowserOpenResult>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('BrowserSessionBridge');
