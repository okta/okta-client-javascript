/**
 * Browser session result returned from openAuthSession
 * Matches the expo-web-browser API for compatibility
 */
export type BrowserSessionResult = {
  type: 'success';
  url: string;
} | {
  type: 'cancel' | 'dismiss';
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
