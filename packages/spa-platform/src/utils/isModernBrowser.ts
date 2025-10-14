/**
 * @module Utils
 */


/**
 * Verifies the browser supports all features this library depends on
 * 
 * @returns boolean
 */
export function isModernBrowser (): boolean {
  if (
    navigator && navigator.locks &&     // supports WebLocks
    crypto && crypto.subtle &&          // supports WebCrypto
    BroadcastChannel &&                 // supports BroadcastChannel
    AbortController && AbortSignal      // supports AbortController
  ) {
    return true;
  }

  return false;
}
