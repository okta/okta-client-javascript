import type { OAuth2FlowOptions } from '../types';

export interface AuthorizationCodeFlowOptions extends OAuth2FlowOptions {
  redirectUri: string | URL;
  additionalParameters?: Record<string, string>;
}

export interface RedirectValues {
  code: string;
  state: string;
}
