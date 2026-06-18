/**
 * Browser Session API for React Native
 * Opens an OAuth flow in a native browser (Safari on iOS, Chrome on Android)
 * Based on the expo-web-browser openAuthSessionAsync API
 *
 * @packageDocumentation
 */

import { Linking, Platform, AppState } from 'react-native';
import NativeBrowserSessionBridgeSpec from '../specs/NativeBrowserSessionBridge.ts';
import type { BrowserSessionResult } from './types.ts';
import type { BrowserSessionOptions } from '../specs/NativeBrowserSessionBridge.ts';

export type * from './types.ts';
export type { BrowserSessionOptions };


// iOS: Use native ASWebAuthenticationSession which handles OAuth natively
// No Linking listener needed - native session intercepts redirects
async function openAuthSessionIOS (
  url: string,
  redirectUri: string,
  options: BrowserSessionOptions
): Promise<BrowserSessionResult> {
  // Extract the scheme from redirectUri if it contains ://
  // e.g., 'com.example://callback' -> 'com.example'
  let redirectScheme = redirectUri;
  const schemeMatch = redirectUri.match(/^([^:/]+)/);
  if (schemeMatch) {
    redirectScheme = schemeMatch[1];
  }

  return await NativeBrowserSessionBridgeSpec.openAuthSession(url, redirectScheme, options);
}

async function openAuthSessionAndroid (
  url: string,
  redirectUri: string,
  options: BrowserSessionOptions
): Promise<BrowserSessionResult> {

  console.log('[BrowserSession]', 'open android', redirectUri, options)

  let deepLinkResolver: (value: BrowserSessionResult) => void;
  let appStateResolver: () => void;
  
  const deepLinkPromise = new Promise<BrowserSessionResult> ((resolve) => {
    deepLinkResolver = resolve;
  });

  const appStatePromise = new Promise<void> ((resolve) => {
    appStateResolver = resolve;
  })
  .then(() => {
    return { type: 'cancel' as const };
  });

  // Listen for app state changes to detect when browser is dismissed
  console.log('appState', AppState.currentState)
  let appStateSubscription = AppState.addEventListener('change', (state) => {
    console.log('[BrowserSession]', 'app state changed:', state);
    
    if (state === 'active') {
      appStateResolver();
    }
  });

  console.log('[BrowserSession]', 'open android', redirectUri)
  const subscription = Linking.addEventListener('url', ({ url: deepLinkUrl }) => {
      console.log('[BrowserSession]', 'linking listener', deepLinkUrl)
    if (deepLinkUrl.startsWith(redirectUri)) {
      console.log('[BrowserSession]', 'resolving', deepLinkUrl)
      deepLinkResolver({
        type: 'success',
        url: deepLinkUrl,
      });
    }
  });

  console.log('[BrowserSession]', 'registered linking api callback' )

  // Open the browser - it will return immediately when CustomTabsIntent launches
  await NativeBrowserSessionBridgeSpec.openBrowser(url, options);
  console.log('[BrowserSession]', 'bridge promise resolved - browser opened')

  // If deeplink arrives, return success; if app resumes without deeplink, return cancel
  try {
    return await Promise.race([
      deepLinkPromise,    // resolves when deeplink (redirectUri) is navigated to
      appStatePromise     // resolves when app returns to foreground without deeplink
    ]);
  }
  finally {
    console.log('[BrowserSession]', 'finally block')
    subscription.remove();
    appStateSubscription?.remove();
  }
}

/**
 * Opens an authorization flow in a native browser
 *
 * Launches a native browser (Safari on iOS, Chrome/CustomTabsIntent on Android) with the provided URL.
 * Detects when the user completes the OAuth flow and returns to the app via the redirect URI.
 *
 * # iOS Behavior
 * Uses native ASWebAuthenticationSession which handles the entire OAuth flow natively.
 * The session automatically intercepts OAuth redirects and returns control to the app.
 * No Linking listener is needed on iOS.
 *
 * # Android Behavior
 * Uses a polyfill pattern combining CustomTabsIntent with Linking API.
 * Listens for deeplinks from the OAuth provider and races against browser dismissal.
 *
 * @param url - The full OAuth authorization URL
 * @param redirectUri - The redirect URI scheme (e.g., 'com.example://callback')
 *                      Used to detect when the OAuth flow is complete
 * @param options - Configuration options for the browser session:
 *                  - `ephemeralSession`: If true, uses an isolated session without shared cookies/auth
 *                    (Safari on iOS, SHARE_STATE_OFF on Android). Defaults to false for convenience.
 *
 * @returns A promise that resolves with the result of the browser session
 *          - `{ type: 'success', url: '...' }` - User completed OAuth, returned with callback URL
 *          - `{ type: 'cancel' }` - User closed the browser without completing flow
 *          - `{ type: 'dismiss' }` - Browser was dismissed programmatically
 *
 * @throws Error with code if the operation fails:
 *         - 'invalid_url' - The provided URL is malformed
 *         - 'no_activity' (Android) - Current activity not available
 *         - 'no_window' (iOS) - Key window not found
 *         - 'browser_session_error' - Generic native error
 *         - 'native_module_not_available' - Native module not loaded
 *
 * @example
 * ```typescript
 * const redirectUri = 'com.example://callback';
 *
 * try {
 *   const result = await openAuthSession(authUrl, redirectUri, { ephemeralSession: false });
 *   if (result.type === 'success') {
 *     console.log('OAuth successful, code in:', result.url);
 *   } else {
 *     console.log('User cancelled');
 *   }
 * } catch (err) {
 *   console.error('Failed to open browser session:', err);
 * }
 * ```
 */
export async function openAuthSession(
  url: string,
  redirectUri: string,
  options: BrowserSessionOptions = { ephemeralSession: false }
): Promise<BrowserSessionResult> {
  if (!NativeBrowserSessionBridgeSpec) {
    throw new Error(
      'BrowserSessionBridge native module is not available. ' +
      'Ensure you are using react-native-platform and have properly linked native dependencies.'
    );
  }

  switch (Platform.OS) {
    case 'ios':
      return openAuthSessionIOS(url, redirectUri, options);
    case 'android':
      return openAuthSessionAndroid(url, redirectUri, options);
    default:
      throw new Error('Unsupported target platform');
  }
}
