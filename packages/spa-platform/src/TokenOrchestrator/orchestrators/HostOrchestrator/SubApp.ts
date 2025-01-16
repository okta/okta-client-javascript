import type { HostOrchestrator as HO } from '.';
import { shortID, Token, TokenInit } from '@okta/auth-foundation';
import { validateString } from '@okta/auth-foundation/internal';
import { TokenOrchestrator, TokenOrchestratorError, TokenOrchestratorEventEmitter } from '../../TokenOrchestrator';
import { SecureChannel } from '../../../utils/SecureChannel';


export class SubAppOrchestratorEventEmitter extends TokenOrchestratorEventEmitter {
  noHostFound () {
    this.emit('no_host_found');
  }
}

type SubAppBroadcastOptions = {
  timeout: number;
}

// TODO: doc this?
/**
 * @internal
 */
export class SubAppOrchestrator extends TokenOrchestrator {
  readonly id = shortID();
  protected readonly authParams: TokenOrchestrator.OAuth2Params;
  protected readonly emitter = new SubAppOrchestratorEventEmitter();
  public defaultTimeout = 5000;

  #targetOrigin: string = new URL(location.origin).origin;
  #tokenCache: Map<string, Token> = new Map();
  #pendingRequests: Map<string, ReturnType<SubAppOrchestrator['getToken']>> = new Map();

  constructor (public readonly name: string, options: HO.SubAppOptions = {}) {
    super();
    const { targetOrigin, scopes, ...authParams } = options;
    if (targetOrigin) {
      this.#targetOrigin = new URL(targetOrigin).origin;
    }
    this.authParams = {...authParams, scopes };
  }

  // TODO: how does this clean up after itself? does it need a .close() method?
  // public close (): void {}

  protected async broadcast (
    eventName: string,
    data: Record<string, unknown>,
    options: SubAppBroadcastOptions = { timeout: this.defaultTimeout }
  ): Promise<Record<string, unknown>> {
    const requestId = shortID();
    const channel = new SecureChannel(this.name, this.#targetOrigin);

    return new Promise<Record<string, unknown>>((resolve, reject) => {
      const responseChannel = new SecureChannel(requestId, { allowedOrigins: [ this.#targetOrigin ]});

      const timeoutId = setTimeout(() => {
        responseChannel.close();
        reject(new TokenOrchestratorError('timeout'));
      }, options.timeout);

      responseChannel.onmessage = ({ data }) => {
        responseChannel.close();
        clearTimeout(timeoutId);
        resolve(data);
      };

      channel.postMessage({
        eventName,
        requestId,
        subAppId: this.id,
        data,
      });
      channel.close();
    });
  }

  protected getTokenCacheKey (params: TokenOrchestrator.OAuth2Params) {
    const { scopes, clientId } = {...this.authParams, ...params};

    // if no scopes are provided, key by clientId. If no clientId is provided, this orchestrator can only request
    // single token (from an oauth params perspective), it defaults to whatever token is returned by the host
    if (!scopes) {
      return clientId ? clientId : 'DEFAULT';
    }

    let key = scopes.sort().join(' ');
    return clientId ? `${clientId}:${key}` : key;
  }

  public async pingHost (timeout: number = 500): Promise<boolean> {
    try {
      await this.broadcast('PING', { subAppId: this.id }, { timeout });
      return true;
    }
    catch (err) {
      this.emitter.noHostFound();
      return false;
    }
  }

  protected async requestToken (options: TokenOrchestrator.OAuth2Params): Promise<Token | null> {
    const cacheKey = this.getTokenCacheKey(options);
    try {
      const { token: tokenInit, error } = await this.broadcast('TOKEN', options);

      if (error) {
        throw new TokenOrchestratorError(error as string);
      }

      if (tokenInit) {
        const token = new Token(tokenInit as TokenInit);
        this.#tokenCache.set(this.getTokenCacheKey(options), token);
        return token;
      }

      throw new TokenOrchestratorError('Something went wrong');
    }
    finally {
      this.#pendingRequests.delete(cacheKey);
    }
  }

  public async getToken (options: TokenOrchestrator.OAuth2Params = {}): Promise<Token | null> {
    const authParams = {...this.authParams, ...options};
    const cacheKey = this.getTokenCacheKey(authParams);

    if (this.#tokenCache.has(cacheKey)) {
      const token = this.#tokenCache.get(cacheKey)!;
      if (token.willBeValidIn(30)) {
        return token;
      }
      else {
        // remove expired token from cache
        this.#tokenCache.delete(cacheKey);
      }
    }

    if (this.#pendingRequests.has(cacheKey)) {
      return await this.#pendingRequests.get(cacheKey)!;
    }

    const request = this.requestToken(authParams);
    this.#pendingRequests.set(cacheKey, request);
    return request;
  }

  public async authorize(
    input: string | URL | Request,
    init?: RequestInit & { dpopNonce?: string; } & TokenOrchestrator.OAuth2Params
  ): Promise<Request> {
    const request = input instanceof Request ? input : new Request(input, init);
    const { issuer, clientId, scopes, dpopNonce } = {...this.authParams, ...init};
    const authOptions = { issuer, clientId, scopes, nonce: dpopNonce };

    // TODO: cache dpop values?

    const { url, method } = request;
    const { dpop, authorization, tokenType, error } = await this.broadcast('AUTHORIZE', { url, method, ...authOptions });

    if (error) {
      throw new TokenOrchestratorError(error as string);
    }

    if (tokenType === 'DPoP') {
      if (!validateString(dpop)) {
        throw new TokenOrchestratorError('No DPoP header received when expected');
      }

      request.headers.set('dpop', dpop);
    }

    if (!validateString(authorization)) {
      throw new TokenOrchestratorError('No Authorization header received');
    }

    request.headers.set('authorization', authorization);
    return request;
  }
}
