export type AuthMode = 'token_present' | 'dpop' | 'bearer' | 'none';

export interface MockResourceServerOptions {
  /** Auth gating strategy applied to all mocked routes. */
  basePath?: string;
  auth?: AuthMode;
  enableLogging?: boolean;
}
