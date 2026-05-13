/**
 * Browser session result returned from openAuthSession
 * Matches the expo-web-browser API for compatibility
 */
export interface BrowserSessionResult {
  /** 'success' when user completes OAuth flow and is redirected to the callback URL */
  type: 'success' | 'cancel' | 'dismiss';
  /**
   * The final URL after OAuth flow completes (with authorization code)
   * Only set when type is 'success'
   */
  url?: string;
}

/**
 * Error codes that can be returned when openAuthSession fails
 */
export type BrowserSessionErrorCode =
  | 'invalid_url'
  | 'no_activity'
  | 'no_window'
  | 'browser_session_error'
  | 'native_module_not_available';
