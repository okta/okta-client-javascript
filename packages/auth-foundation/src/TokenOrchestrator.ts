/**
 * @module TokenOrchestrator
 */

import type {
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
 * @typeParam P - Parameters accepted by {@link TokenOrchestrator.getToken}. See {@link TokenOrchestrator.authParamKeys}
 * @typeParam E - Map of all events fired from {@link TokenOrchestrator.emitter}
 *
 * @remarks
 * // TODO
 * Each [Platform Library](/docs/structure#tier-3) offers {@link TokenOrchestrator} implementations relevant to the corresponding platform.
 *
 * @see
 * * Orchestrator Consumer Example: {@link FetchClient}
 */
export abstract class TokenOrchestrator<
  P extends TokenOrchestrator.AuthorizeParams = TokenOrchestrator.AuthorizeParams,
  E extends TokenOrchestrator.Events = TokenOrchestrator.Events
> {
  /**
   * Possible events: {@link TokenOrchestrator.Events}
   *
   * @example
   * To add a new event within a derived class, first extend {@link TokenOrchestrator.Events}, like so:
   * ```ts
   * type MyOrchestratorEvents = { 'no_token': { params: any } } & TokenOrchestrator.Events;
   *
   * class MyTokenOrchestrator<
   *   E extends MyOrchestratorEvents = MyOrchestratorEvents
   * > extends TokenOrchestrator<TokenOrchestrator.AuthorizeParams, E> {
   *   protected async getToken (params: TokenOrchestrator.AuthorizeParams = {}): Promise<Token | null> {
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

  /**
   * Keys of `P` (the params accepted by {@link TokenOrchestrator.getToken}). Used by {@link TokenOrchestrator.extractAuthParams}
   * to separate params from other options, like {@link !RequestInit}. Consumers of an orchestrator (like {@link FetchClient})
   * rely on this to forward params to {@link TokenOrchestrator.getToken}
   *
   * @remarks
   * Params are separated by key name, therefore additional params must not share a name with a {@link !RequestInit} key
   * (`body`, `headers`, `signal`, etc.), `dpopNonce` or `authorizeRequest`
   *
   * @example
   * To accept additional params within a derived class, first extend {@link TokenOrchestrator.AuthorizeParams}, like so:
   * ```ts
   * type MyParams = TokenOrchestrator.AuthorizeParams & { audience?: string };
   *
   * class MyTokenOrchestrator extends TokenOrchestrator<MyParams> {
   *   // `satisfies` ensures all keys of `MyParams` are listed
   *   protected readonly authParamKeys = {
   *     ...TokenOrchestrator.authorizeParamKeys,
   *     audience: undefined
   *   } satisfies TokenOrchestrator.AuthorizeParamKeys<MyParams>;
   *
   *   protected async getToken (params: MyParams = {}): Promise<Token | null> {
   *     // `params.audience` is available, even when called via `FetchClient.fetch(url, { audience })`
   *   }
   * }
   * ```
   */
  protected readonly authParamKeys: TokenOrchestrator.AuthorizeParamKeys<P> =
    TokenOrchestrator.authorizeParamKeys as TokenOrchestrator.AuthorizeParamKeys<P>;

  /** alias for `this.emitter.on` */
  on (...args: Parameters<EventEmitter<E>['on']>) {
    return this.emitter.on(...args);
  }

  /** alias for `this.emitter.off` */
  off (...args: Parameters<EventEmitter<E>['off']>) {
    return this.emitter.off(...args);
  }

  /**
   * Separates the params accepted by this orchestrator (see {@link TokenOrchestrator.authParamKeys}) from other options
   */
  public extractAuthParams (input: { [key: string]: any }): { authParams: P; rest: { [key: string]: any } } {
    return TokenOrchestrator.extractAuthParams<P>(input, this.authParamKeys);
  }

  /**
   * @abstract
   * Retrieves a valid {@link Token.Token | Token} to be used within an application
   *
   */
  // NOTE: `params` is optional so implementations can declare a default value (`params: P = {}`) while `P` remains inferable
  public abstract getToken (params?: P): Promise<Token | null>;

  /**
   * @abstract
   * Invalidates a {@link Token.Token | Token}, so subsequent {@link TokenOrchestrator.getToken | getToken} calls will result in the invalidated token
   */
  public abstract invalidateToken (id: string): Promise<void>;

  /**
   * Signs an outgoing {@link !Request} with an `Authorization` header via {@link Token | Token} retrieved from {@link getToken}
   * 
   * Optionally {@link TokenOrchestrator.AuthorizeParams | AuthorizeParams} (or any additional params accepted by
   * this orchestrator) can be provided to be passed along to {@link getToken}
   */
  public async authorize (
    input: string | URL | Request,
    init: RequestAuthorizerInit & Partial<P> = {}
  ): Promise<{ request: Request, tokenId: string }> {
    // `fetchInit` will include dpopNonce
    const { authParams, rest: fetchInit } = this.extractAuthParams(init);

    const token = await this.getToken(authParams);
    if (!token) {
      throw new TokenOrchestratorError('Unable to acquire token to sign request');
    }

    return {
      request: await token.authorize(input, fetchInit),
      tokenId: token.id
    };
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

  /**
   * A map containing every key of `P`. Used with `satisfies` to ensure (at compile time) no keys are missing
   *
   * @see {@link TokenOrchestrator.authParamKeys}
   */
  export type AuthorizeParamKeys<P extends AuthorizeParams = AuthorizeParams> = {
    readonly [K in keyof Required<P>]: undefined
  };

  // https://stackoverflow.com/a/54308812
  // A clever way of utilizing TS to ensure this map contains all keys of `AuthorizeParams`
  // This produces a reference to all the keys with `AuthorizeParams` in code
  /**
   * Keys of {@link AuthorizeParams}. Spread this map when defining {@link TokenOrchestrator.authParamKeys} for additional params
   */
  export const authorizeParamKeys = {
    issuer: undefined,
    clientId: undefined,
    scopes: undefined,
    maxAge: undefined,
    acrValues: undefined,
  } satisfies AuthorizeParamKeys;

  /**
   * Utility function to separate {@link AuthorizeParams} from other options.
   * Intended to help separate params from intersected types in method signatures
   *
   * Convenient for custom {@link TokenOrchestrator} implementations
   *
   * @param keys - Keys of the params to separate, defaults to {@link authorizeParamKeys}
   */
  export function extractAuthParams<P extends AuthorizeParams = AuthorizeParams> (
    input: { [key: string]: any },
    keys: AuthorizeParamKeys<P> = authorizeParamKeys as AuthorizeParamKeys<P>
  ): { authParams: P; rest: { [key: string]: any }} {
    const authParams = {} as P;
    const rest = {};
    for (const key of Object.keys(input)) {
      if (input[key] !== undefined) {
        const obj = key in keys ? authParams : rest;
        obj[key] = input[key];
      }
    }
    return { authParams, rest };
  }
}
