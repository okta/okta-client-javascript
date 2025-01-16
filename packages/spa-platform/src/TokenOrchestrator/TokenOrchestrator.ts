import {
  Token,
  type RequestAuthorizer,
  type RequestAuthorizerInit,
  EventEmitter,
  AuthSdkError,
  type JsonRecord
} from '@okta/auth-foundation';

// TODO: doc all of this

/**
 * @module TokenOrchestrator
 */


export class TokenOrchestratorError extends AuthSdkError {}

export class TokenOrchestratorEventEmitter extends EventEmitter {
  error (error: Error | JsonRecord, type?: string) {
    this.emit('error', { error, type });
  }
}

/**
 * @abstract
 *
 * Defines how {@link Token}s are retrieved to be consumed within an application
 *
 * @see {@link FetchClient}
 */
export abstract class TokenOrchestrator implements RequestAuthorizer {
  protected readonly emitter: EventEmitter = new TokenOrchestratorEventEmitter();

  on (...args: Parameters<EventEmitter['on']>) {
    return this.emitter.on(...args);
  }

  off (...args: Parameters<EventEmitter['off']>) {
    return this.emitter.off(...args);
  }

  /**
   * @abstract
   * Retrieves a valid {@link Token} to be used within an application
   *
   */
  public abstract getToken (options: TokenOrchestrator.OAuth2Params): Promise<Token | null>;

  // TODO: doc this
  public async authorize (
    input: string | URL | Request,
    init: RequestAuthorizerInit & TokenOrchestrator.OAuth2Params = {}
  ): Promise<Request> {
    // fetchInit includes dpopNonce
    const { issuer, clientId, scopes, ...fetchInit } = init;
    const authOptions = { issuer, clientId, scopes };

    const token = await this.getToken(authOptions);
    if (!token) {
      throw new TokenOrchestratorError('Unable to acquire token to sign request');
    }

    return token.authorize(input, fetchInit);
  }
}

export namespace TokenOrchestrator {
  // TODO: use existing type?
  export type OAuth2Params = {
    issuer?: string | URL;
    clientId?: string;
    scopes?: string[];
  };
}
