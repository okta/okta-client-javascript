/**
 * Browser Session API for React Native
 * Opens an OAuth flow in a native browser (Safari on iOS, Chrome on Android)
 * Based on the expo-web-browser openAuthSessionAsync API
 *
 * @packageDocumentation
 */

import { Linking, Platform } from 'react-native';
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

  let resolver: (value: BrowserSessionResult) => void;
  const deepLinkPromise = new Promise<BrowserSessionResult> ((resolve) => {
    resolver = resolve;
  });

  console.log('[BrowserSession]', 'open android', redirectUri)
  const subscription = Linking.addEventListener('url', ({ url: deepLinkUrl }) => {
      console.log('[BrowserSession]', 'linking listener', deepLinkUrl)
    if (deepLinkUrl.startsWith(redirectUri)) {
        console.log('[BrowserSession]', 'resolving', deepLinkUrl)
      resolver({
        type: 'success',
        url: deepLinkUrl,
      });
    }
  });

    console.log('[BrowserSession]', 'registered linking api callback' )

  // Browser promise - just opens the browser, doesn't wait for result
  // Android CustomTabsIntent launches immediately, returns opened status
  const browserPromise = NativeBrowserSessionBridgeSpec.openBrowser(url, options)
  .then(() => {
      console.log('[BrowserSession]', 'bridge promise resolved')
    // return a promise that never resolves
    return new Promise<BrowserSessionResult>(() => {});
  })
  .catch((error) => {
      console.log('[BrowserSession]', 'cancel called')
    // If browser fails to open, return cancel
    return { type: 'cancel' as const };
  });

  // TODO: throw if browser fails to open, listen for close

  // If deeplink arrives, return success; if browser closes without redirect, return cancel
  try {
    return await Promise.race([
      deepLinkPromise,    // only resolves when deeplink (redirectUri) is navigated to
      browserPromise      // only throws when user closes browser window
    ]);
  }
  finally {
      console.log('[BrowserSession]', 'finally block')
    subscription.remove();
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
