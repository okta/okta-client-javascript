import type { OAuth2FlowOptions } from '../types';

export interface SessionLogoutFlowOptions extends OAuth2FlowOptions {
  logoutRedirectUri: string | URL;
  additionalParameters?: Record<string, string>;
}
