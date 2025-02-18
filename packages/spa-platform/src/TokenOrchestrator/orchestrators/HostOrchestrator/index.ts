import type { TokenOrchestrator } from '../../TokenOrchestrator';
import { TokenInit, AuthSdkError } from '@okta/auth-foundation';
import { HostOrchestrator as HostApp } from './Host';
import { SubAppOrchestrator } from './SubApp';

// NOTE: In this context, "request"/"response" refer to communication between the Host and Sub apps


export namespace HostOrchestrator {
  export abstract class Host extends HostApp {}
  export class SubApp extends SubAppOrchestrator {}

  /**
   * @internal
   */
  export class HostOrchestratorError extends AuthSdkError {}

  export type HostOptions = {
    allowedOrigins?: string[];
  }

  export type SubAppOptions = TokenOrchestrator.OAuth2Params & {
    targetOrigin?: string;
  }

  export type RequestEventName = 'ACTIVATED' | 'PING' | 'TOKEN' | 'AUTHORIZE' | 'PROFILE';

  export type RequestEvent = {
    eventName: RequestEventName;
    requestId: string;
    subAppId: string;
    data: any;
  }

  export type ErrorResponse = { error: string; }

  export type TokenRequest = {
    issuer: string;
    clientId: string;
    scopes: string[];
  };

  export type TokenResponse = { token: TokenInit } | ErrorResponse;

  export type AuthorizeRequest = TokenRequest & {
    url: string;
    method: string;
    nonce?: string;
  };

  export type AuthorizeResponse = {
    tokenType: string;
    dpop?: string;
    authorization: string;
  } | ErrorResponse;

}
