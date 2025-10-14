/**
 * @module
 * @mergeModuleWith TokenOrchestrators
 */

import {
  type TokenOrchestrator,
  type AcrValues,
  type TokenInit,
  type JsonRecord,
  Token
} from '@okta/auth-foundation';
import { HostOrchestrator as HostApp } from './Host.ts';
import { SubAppOrchestrator } from './SubApp.ts';

// NOTE: In this context, "request"/"response" refer to communication between the Host and Sub apps


export namespace HostOrchestrator {
  /**
   * Receives and fulfills delegated {@link Platform.Token | Token} requests from {@link HostOrchestrator.SubApp} instances
   * 
   * @group Host
   */
  export abstract class Host extends HostApp {}

  /**
   * A {@link AuthFoundation!TokenOrchestrator | TokenOrchestrator} instance which delegates all {@link Platform.Token | Token}
   * requests to a {@link HostOrchestrator.Host}
   * 
   * @group SubApp
   */
  export class SubApp extends SubAppOrchestrator {}

  /**
   * A utility class to adapt any {@link AuthFoundation!TokenOrchestrator | TokenOrchestrator} instance into a {@link HostOrchestrator.Host}
   * @group ProxyHost
   */
  export class ProxyHost extends HostOrchestrator.Host {
    constructor (name: string, protected readonly orchestrator: Exclude<TokenOrchestrator, HostOrchestrator.SubApp>) {
      if (orchestrator instanceof HostOrchestrator.SubApp) {
        throw new TypeError('HostOrchestrator.SubApp cannot be adapted to a host');
      }

      super(name);
    }

    async findToken (params: TokenOrchestrator.AuthorizeParams = {}): Promise<Token | ErrorResponse> {
      const token = await this.orchestrator.getToken(params);
      if (!token) {
        return { error: 'unable to retrieve a token' };
      }

      return token;
    }
  }

  /**
   * @group Host
   */
  export type HostOptions = {
    allowedOrigins?: string[];
  };

  /**
   * @group Host
   */
  export type HostEvents = {
    'duplicate_host': { id: string, duplicateId: string };
    'login_prompt_required': Record<string, any>;
    'request_received': { request: RequestEvent };
    'request_fulfilled': { request: RequestEvent, response: Response };
  };

  /**
   * @group SubApp
   */
  export type SubAppOptions = TokenOrchestrator.AuthorizeParams & {
    targetOrigin?: string;
  };

  /**
   * @group SubApp
   */
  export type SubAppEvents = {
    'no_host_found': void;
  } & TokenOrchestrator.Events;

  /**
   * @group Types
   */
  export type RequestEventPayloads = {
    'ACTIVATED': undefined;
    'PING': undefined;
    'TOKEN': TokenRequest;
    'AUTHORIZE': AuthorizeRequest;
    'PROFILE': TokenRequest;
  };

  /**
   * @group Types
   */
  export type RequestEvent = {
    [K in keyof RequestEventPayloads]: { eventName: K; data: RequestEventPayloads[K] } &
    {
      requestId: string;
      subAppId: string;
    }
  }[keyof RequestEventPayloads];

  export type Response = ErrorResponse | PingResponse | TokenResponse | AuthorizeResponse | ProfileResponse;

  /**
   * @group Types
   */
  export type ErrorResponse = { error: string; };

  /**
   * @group Types
   */
  export type PingResponse = { message: 'PONG' };

  /**
   * @group Types
   */
  export type TokenRequest = {
    issuer: string;
    clientId: string;
    scopes: string[];
    acrValues?: AcrValues,
    maxAge?: number
  };

  /**
   * @group Types
   */
  export type TokenResponse = { token: TokenInit } | ErrorResponse;

  /**
   * @group Types
   */
  export type AuthorizeRequest = TokenRequest & {
    url: string;
    method: string;
    nonce?: string;
  };

  /**
   * @group Types
   */
  export type AuthorizeResponse = {
    tokenType: string;
    dpop?: string;
    authorization: string;
  } | ErrorResponse;

  /**
   * @group Types
   */
  export type ProfileResponse = { profile: JsonRecord } | ErrorResponse;

}
