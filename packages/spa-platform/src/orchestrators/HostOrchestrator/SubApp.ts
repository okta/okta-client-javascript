import type { HostOrchestrator as HO } from './index.ts';
import {
  shortID,
  type SubSet,
  ignoreUndefineds,
  TokenOrchestrator,
  TokenOrchestratorError,
  EventEmitter
} from '@okta/auth-foundation';
import { validateString } from '@okta/auth-foundation/internal';
import { Token } from '../../platform/index.ts';
import { OrchestrationBridge } from './OrchestrationBridge.ts';


export type SubAppBroadcastOptions = {
  timeout: number;
}

function toPrimitiveParams (
  authParams: TokenOrchestrator.AuthorizeParams
): SubSet<TokenOrchestrator.AuthorizeParams, 'issuer', string | undefined> {
  let issuer = authParams.issuer;
  if (issuer && issuer instanceof URL) {
    issuer = issuer.href;
  }
  return { ...authParams, issuer };
}

// TODO: doc this?
export class SubAppOrchestrator extends TokenOrchestrator {
  readonly id = shortID();
  protected readonly authParams: TokenOrchestrator.AuthorizeParams;
  protected readonly emitter: EventEmitter<HO.SubAppEvents> = new EventEmitter();
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

  protected async broadcast<K extends keyof HO.RequestEvent & keyof HO.ResponseEvent> (
    eventName: K,
    data: HO.RequestEvent[K]['data'],
    options: SubAppBroadcastOptions = { timeout: this.defaultTimeout }
  ): Promise<HO.ResponseEvent[K]> {
    const bus = new OrchestrationBridge(this.name, { targetOrigin: this.#targetOrigin });
    const { result } = bus.send({
      eventName,
      data,
      subAppId: this.id
    } as HO.RequestEvent[K], { ...options });

    return await result;
  }

  // TODO: support multiple issuers
  protected getTokenCacheKey (params: TokenOrchestrator.AuthorizeParams) {
    const { scopes, clientId } = {...this.authParams, ...params};

    // if no scopes are provided, key by clientId. If no clientId is provided, this orchestrator can only request
    // single token (from an oauth params perspective), it defaults to whatever token is returned by the host
    if (!scopes) {
      return clientId ? clientId : 'DEFAULT';
    }

    let key = scopes.sort().join(' ');
    return clientId ? `${clientId}:${key}` : key;
  }

  protected async ping (timeout: number): Promise<boolean> {
    try {
      await this.broadcast('PING', undefined, { timeout });
      return true;
    }
    catch (err) {
      return false;
    }
  }

  public async pingHost ({ interval = 100, attempts = 5 } = {}): Promise<boolean> {
    for (let i=0; i<attempts; i++) {
      const ping = await this.ping(interval);
      if (ping) {
        return true;
      }
    }

    this.emitter.emit('no_host_found');
    return false;
  }

  protected async requestToken (params: TokenOrchestrator.AuthorizeParams): Promise<Token | null> {
    const cacheKey = this.getTokenCacheKey(params);
    try {
      const response = await this.broadcast('TOKEN', toPrimitiveParams(params));

      // `in` syntax required for TS to infer type
      if ('error' in response) {
        throw new TokenOrchestratorError(response.error);
      }

      if (response.token) {
        const token = new Token(response.token);
        this.#tokenCache.set(this.getTokenCacheKey(params), token);
        return token;
      }

      throw new TokenOrchestratorError('Something went wrong');
    }
    finally {
      this.#pendingRequests.delete(cacheKey);
    }
  }

  /**
   * Retrieves a valid {@link Platform.Token | Token} to be used within an application
   */
  public async getToken (params: TokenOrchestrator.AuthorizeParams = {}): Promise<Token | null> {
    const authParams = {...this.authParams, ...ignoreUndefineds(params)};
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
    init?: RequestInit & { dpopNonce?: string; } & TokenOrchestrator.AuthorizeParams
  ): Promise<Request> {
    const request = input instanceof Request ? input : new Request(input, init);
    const { issuer, clientId, scopes, acrValues, maxAge, dpopNonce } = {
      ...this.authParams,
      // removes `undefined`
      ...ignoreUndefineds({...init})
    };
    const authParams = { issuer, clientId, scopes, acrValues, maxAge, nonce: dpopNonce };

    // TODO: cache dpop values?

    const { url, method } = request;
    const response = await this.broadcast('AUTHORIZE', { url, method, ...(toPrimitiveParams(authParams)) });

    // `in` syntax required for TS to infer type
    if ('error' in response) {
      throw new TokenOrchestratorError(response.error);
    }

    const { dpop, authorization, tokenType } = response;

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
