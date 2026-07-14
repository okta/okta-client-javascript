/**
 * @module TokenOrchestrator
 */

import type {
  RequestAuthorizer,
  RequestAuthorizerInit,
  JsonRecord,
  AcrValues
} from './types/index.ts';
import { Token } from './Token.ts';
import { TokenOrchestratorError } from './errors/index.ts';
import { EventEmitter } from './utils/EventEmitter.ts';


/**
 * An abstraction layer between {@link Token} consumers and an application's internal management of {@link Token}s.
 * Implementations of {@link TokenOrchestrator} handle fetching, refreshing, and storing tokens. There is an expectation
 * (but not enforced by code) that tokens provided by {@link TokenOrchestrator} methods are valid (not expired).
 * 
 * Consumers simply call {@link TokenOrchestrator.getToken} (or {@link TokenOrchestrator.authorize}) to use tokens as needed.
 * 
 * @typeParam E - Map of all events fired from {@link TokenOrchestrator.emitter}
 * 
 * @remarks
 * // TODO
 * Each [Platform Library](/docs/structure#tier-3) offers {@link TokenOrchestrator} implementations relevant to the corresponding platform.
 *
 * @see
 * * Orchestrator Consumer Example: {@link FetchClient}
 */
export abstract class TokenOrchestrator<E extends TokenOrchestrator.Events = TokenOrchestrator.Events> implements RequestAuthorizer {
  /**
   * Possible events: {@link TokenOrchestrator.Events}
   * 
   * @example
   * To add a new event within a derived class, first extend {@link TokenOrchestrator.Events}, like so:
   * ```ts
   * type MyOrchestratorEvents = { 'no_token': { params: any } } & TokenOrchestrator.Events;
   * 
   * class MyTokenOrchestrator<E extends MyOrchestratorEvents = MyOrchestratorEvents> extends TokenOrchestrator<E> {
   *   protected async getToken (params: TokenOrchestrator.AuthorizeParams): Promise<Token | null> {
   *     const token = this.findTokenInStorage(params);     // example method
   *     if (token === null) {
   *       // this `.emit` call will be properly typed
   *       this.emitter.emit('no_token', params);
   *     }
   *     return token;
   *   }
   * }
   * ```
   */
  protected readonly emitter: EventEmitter<E> = new EventEmitter();

  /** alias for `this.emitter.on` */
  on (...args: Parameters<EventEmitter<E>['on']>) {
    return this.emitter.on(...args);
  }

  /** alias for `this.emitter.off` */
  off (...args: Parameters<EventEmitter<E>['off']>) {
    return this.emitter.off(...args);
  }

  /**
   * @abstract
   * Retrieves a valid {@link Token.Token | Token} to be used within an application
   *
   */
  public abstract getToken (params: TokenOrchestrator.AuthorizeParams): Promise<Token | null>;

  /**
   * Signs an outgoing {@link !Request} with an `Authorization` header via {@link Token | Token} retrieved from {@link getToken}
   * 
   * Optionally {@link TokenOrchestrator.AuthorizeParams | AuthorizeParams} can be provided to be passed along to {@link getToken}
   */
  public async authorize (
    input: string | URL | Request,
    init: RequestAuthorizerInit & TokenOrchestrator.AuthorizeParams = {}
  ): Promise<Request> {
    // `fetchInit` will include dpopNonce
    const { authParams, rest: fetchInit } = TokenOrchestrator.extractAuthParams(init);

    const token = await this.getToken(authParams);
    if (!token) {
      throw new TokenOrchestratorError('Unable to acquire token to sign request');
    }

    return token.authorize(input, fetchInit);
  }
}

export namespace TokenOrchestrator {
  /**
   * @interface
   * Map of events fired from {@link TokenOrchestrator.emitter}
   * 
   * @example
   * ```ts
   * // key = Event name
   * // value = Event Type
   * client.emitter.on('error', ({ error }) => {
   *   console.log(error);
   * });
   * ```
   */
  export type Events = {
    error: { error: Error | JsonRecord, type?: string };
  };

  // TODO: use existing type?
  /**
   * Parameters used to make OAuth2 token requests
   */
  export type AuthorizeParams = {
    issuer?: string | URL;
    clientId?: string;
    scopes?: string[];
    maxAge?: number;
    acrValues?: AcrValues;
  };

  // https://stackoverflow.com/a/54308812
  // A clever way of utilizing TS to ensure this map contains all keys of `AuthorizeParams`
  // This produces a reference to all the keys with `AuthorizeParams` in code
  const paramKeys = {
    issuer: undefined,
    clientId: undefined,
    scopes: undefined,
    maxAge: undefined,
    acrValues: undefined,
  } satisfies { [K in keyof Required<AuthorizeParams>]: undefined };

  /**
   * Utility function to separate {@link AuthorizeParams} from other options.
   * Intended to help separate params from intersected types in method signatures
   * 
   * Convenient for custom {@link TokenOrchestrator} implementations
   */
  export function extractAuthParams (
    input: { [key: string]: any }
  ): { authParams: TokenOrchestrator.AuthorizeParams; rest: { [key: string]: any }} {
    const authParams = {};
    const rest = {};
    for (const key of Object.keys(input)) {
      if (input[key] !== undefined) {
        const obj = key in paramKeys ? authParams : rest;
        obj[key] = input[key];
      }
    }
    return { authParams, rest };
  }
}
