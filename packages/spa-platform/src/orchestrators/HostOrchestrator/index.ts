/**
 * @module
 * @mergeModuleWith Orchestrators
 */

import {
  type TokenOrchestrator,
  type AcrValues,
  type JsonRecord,
  type TokenPrimitiveInit,
  Token
} from '@okta/auth-foundation/core';
import { HostOrchestrator as HostApp } from './Host.ts';
import { SubAppOrchestrator } from './SubApp.ts';

// NOTE: In this context, "request"/"response" refer to communication between the Host and Sub apps

/**
 * @overrideContent orchestrators/HostOrchestrator/doc.md
 * @overridePath orchestrators/HostOrchestrator
 */
export namespace HostOrchestrator {
  // /**
  //  * Receives and fulfills delegated {@link AuthFoundation!Token | Token} requests from {@link HostOrchestrator.SubApp} instances
  //  * 
  //  * @group Host
  //  */
  // export abstract class Host<E extends HostEvents = HostEvents> extends HostApp<E> {}

  /**
   * @reexport
   */
  export const Host: typeof HostApp = HostApp;
  export type Host<E extends HostEvents = HostEvents> = InstanceType<typeof HostApp<E>>;

  // /**
  //  * A {@link AuthFoundation!TokenOrchestrator | TokenOrchestrator} instance which delegates all {@link AuthFoundation!Token | Token}
  //  * requests to a {@link HostOrchestrator.Host}
  //  * 
  //  * @group SubApp
  //  */
  // export class SubApp<E extends SubAppEvents = SubAppEvents> extends SubAppOrchestrator<E> {}
  /**
   * @reexport
   */
  export const SubApp = SubAppOrchestrator;
  export type SubApp<E extends SubAppEvents = SubAppEvents> = InstanceType<typeof SubAppOrchestrator<E>>;

  /**
   * A utility class to adapt any {@link AuthFoundation!TokenOrchestrator | TokenOrchestrator} instance into a {@link HostOrchestrator}
   * @group ProxyHost
   */
  export class ProxyHost<E extends HostEvents = HostEvents> extends HostOrchestrator.Host<E> {
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
   * 
   * @group Host
   */
  export type HostOptions = {
    allowedOrigins?: string[];
  };

  /**
   * Map of events which can be emitted from {@link HostOrchestrator.emitter}
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
   * @internal
   */
  export type TokenRequestEventPayloads = {
    'TOKEN': TokenRequest;
    'AUTHORIZE': AuthorizeRequest;
    'PROFILE': TokenRequest;
  };

  /**
   * Payload for "host_activated" events. 
   * Sent once a {@link HostOrchestrator.Host} instantiates. Used to detect multiple hosts
   * 
   * @group Types
   * @internal
   */
  export type ActivatedEvent = {
    eventName: 'ACTIVATED';
    hostId: string;
    data: undefined;
  };

  /**
   * @group Types
   * @internal
   */
  export type PingEvent = {
    eventName: 'PING';
    data: undefined;
  };

  /**
   * Loose typing of the request event object structure. Provides slightly more type-safety than
   * using `any` or `unknown` like most generic messaging APIs
   * 
   * @group Types
   * @internal
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
   * @internal
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
   * @internal
   */
  export type AuthorizeRequest = TokenRequest & {
    url?: string;
    method?: string;
    nonce?: string;
  };

  /**
   * Map of responses from a HostOrchestrator request event
   * @group Types
   * @internal
   */
  export type ResponseEvent = {
    'TOKEN': TokenResponse;
    'AUTHORIZE': AuthorizeResponse;
    'PROFILE': ProfileResponse;
    'PING': PingResponse;
    'ACTIVATED': object;
  }

  /**
   * @group Types
   * @internal
   */
  export type ErrorResponse = { error: string; };

  /**
   * @group Types
   * @internal
   */
  export type PingResponse = { message: 'PONG' };

  /**
   * @group Types
   * @internal
   */
  export type TokenResponse = { token: TokenPrimitiveInit } | ErrorResponse;

  /**
   * @group Types
   * @internal
   */
  export type AuthorizeResponse = {
    tokenType: string;
    dpop?: string;
    authorization: string;
  } | ErrorResponse;

  /**
   * @group Types
   * @internal
   */
  export type ProfileResponse = { profile: JsonRecord } | ErrorResponse;

}
