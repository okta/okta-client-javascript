import { type TokenOrchestrator } from '../../TokenOrchestrator';
import { TokenInit, AuthSdkError, Token } from '@okta/auth-foundation';
import { HostOrchestrator as HostApp } from './Host';
import { SubAppOrchestrator } from './SubApp';

// NOTE: In this context, "request"/"response" refer to communication between the Host and Sub apps


export namespace HostOrchestrator {
  export abstract class Host extends HostApp {}
  export class SubApp extends SubAppOrchestrator {}

  /**
   * A utility class to adapt any {@link TokenOrchestrator} instance into a {@link HostOrchestrator.Host}
   */
  export class ProxyHost extends HostOrchestrator.Host {
    constructor (name: string, protected readonly orchestrator: Exclude<TokenOrchestrator, HostOrchestrator.SubApp>) {
      if (orchestrator instanceof HostOrchestrator.SubApp) {
        throw new TypeError('HostOrchestrator.SubApp cannot be adapted to a host');
      }

      super(name);
    }

    async findToken(params: TokenOrchestrator.OAuth2Params = {}): Promise<Token | ErrorResponse> {
      const token = await this.orchestrator.getToken(params);
      if (!token) {
        return { error: 'unable to retrieve a token' };
      }

      return token;
    }
  }

  /**
   * @internal
   */
  export class HostOrchestratorError extends AuthSdkError {}

  export type HostOptions = {
    allowedOrigins?: string[];
  };

  export type SubAppOptions = TokenOrchestrator.OAuth2Params & {
    targetOrigin?: string;
  };

  export type RequestEventName = 'ACTIVATED' | 'PING' | 'TOKEN' | 'AUTHORIZE' | 'PROFILE';

  export type RequestEvent = {
    eventName: RequestEventName;
    requestId: string;
    subAppId: string;
    data: any;
  };

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
