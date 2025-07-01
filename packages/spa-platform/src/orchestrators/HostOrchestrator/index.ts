/**
 * @module
 * @mergeModuleWith TokenOrchestrators
 */

import {
  type TokenOrchestrator,
  type AcrValues,
  type JsonRecord,
  type TokenPrimitiveInit,
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
    'request_received': { request: RequestEvent[keyof RequestEvent] };
    'request_fulfilled': { request: RequestEvent[keyof RequestEvent], response: ResponseEvent[keyof ResponseEvent] };
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
  export type TokenRequestEventPayloads = {
    'TOKEN': TokenRequest;
    'AUTHORIZE': AuthorizeRequest;
    'PROFILE': TokenRequest;
  };

  /**
   * @group Types
   * Payload for "host_activated" events. 
   * Sent once a {@link HostOrchestrator.Host} instantiates. Used to detect multiple hosts
   */
  export type ActivatedEvent = {
    eventName: 'ACTIVATED';
    hostId: string;
    data: undefined;
  };

  /**
   * @group Types
   */
  export type PingEvent = {
    eventName: 'PING';
    data: undefined;
  };

  /**
   * @group Types
   * Lose typing of the request event object structure. Provides slightly more type-safety than
   * using `any` or `unknown` like most generic messaging APIs
   */
  export type RequestEvent = ({
    [K in keyof TokenRequestEventPayloads]: { 
      eventName: K;
      data: TokenRequestEventPayloads[K];
      requestId: string;
      subAppId: string;
    }
  }
  & {
    ACTIVATED: ActivatedEvent;
    PING: PingEvent;
  }
);

  /**
   * @group Types
   */
  export type TokenRequest = {
    issuer?: string;
    clientId?: string;
    scopes?: string[];
    acrValues?: AcrValues,
    maxAge?: number
  };

  /**
   * @group Types
   */
  export type AuthorizeRequest = TokenRequest & {
    url?: string;
    method?: string;
    nonce?: string;
  };

  /**
   * @group Types
   * Map of responses from a HostOrchestrator request event
   */
  export type ResponseEvent = {
    'TOKEN': TokenResponse;
    'AUTHORIZE': AuthorizeResponse;
    'PROFILE': ProfileResponse;
    'PING': ProfileResponse;
    'ACTIVATED': object;
  }

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
  export type TokenResponse = { token: TokenPrimitiveInit } | ErrorResponse;

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
