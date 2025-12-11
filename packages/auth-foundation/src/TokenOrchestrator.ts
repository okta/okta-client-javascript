import type {
  RequestAuthorizer,
  RequestAuthorizerInit,
  JsonRecord,
  AcrValues
} from './types/index.ts';
import { Token } from './Token.ts';
import { TokenOrchestratorError } from './errors/index.ts';
import { EventEmitter } from './utils/EventEmitter.ts';


// TODO: doc all of this

/**
 * @module TokenOrchestrator
 */


/**
 * @abstract
 *
 * Defines how {@link Token | Tokens} are retrieved to be consumed within an application
 *
 * @see {@link FetchClient}
 */
export abstract class TokenOrchestrator<E extends TokenOrchestrator.Events = TokenOrchestrator.Events> implements RequestAuthorizer {
  protected readonly emitter: EventEmitter<E> = new EventEmitter();

  on (...args: Parameters<EventEmitter<E>['on']>) {
    return this.emitter.on(...args);
  }

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
   * Signs an outgoing {@link !Request} with an `Authorization` header via {@link Token.Token | Token} retrieved from {@link getToken}
   * 
   * Optionally {@link TokenOrchestrator.AuthorizeParams | AuthorizeParams} can be provided to be passed along to {@link getToken}
   * 
   * @see {@link FetchClient}
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
  // A clever way of utilizing TS to ensure this array contains all keys of `AuthorizeParams`
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
