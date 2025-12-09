/**
 * @module
 * @mergeModuleWith Networking
 */

import type { JsonRecord, JSONSerializable } from '../types/index.ts';
import { DPoPNonceCache } from '../oauth2/dpop/nonceCache.ts';
import { getOktaUserAgent } from './oktaUserAgent.ts';
import { APIRequest } from './requests/APIRequest.ts';
import { mergeHeaders } from '../utils/index.ts';
import { EventEmitter } from '../utils/EventEmitter.ts';
import { APIClientError } from '../errors/index.ts';

export * from './requests/APIRequest.ts';
export * from './requests/OAuth2Request.ts';

/** @internal */
function assertReadableResponse(response: Response) {
  if (response.bodyUsed) {
    throw new TypeError('"response" body has been used already');
  }
}

/**
 * @group APIClient
 */
export abstract class APIClient<E extends APIClient.Events = APIClient.Events> {
  readonly configuration: APIClient.Configuration;
  readonly emitter: EventEmitter<E> = new EventEmitter();
  protected readonly dpopNonceCache: DPoPNonceCache = new DPoPNonceCache.InMemoryCache();
  protected readonly interceptors: APIClient.RequestInterceptor[] = [];

  defaultHeaders: Record<string, string> = { 'X-Okta-User-Agent-Extended': getOktaUserAgent() };
  defaultRequestOptions: APIClient.RequestOptions = { authorizeRequest: false };

  constructor (params: APIClient.ConfigurationParams | APIClient.Configuration = {}) {
    this.configuration = params instanceof APIClient.Configuration ? params : new APIClient.Configuration(params);
  }

  get #fetch (): typeof fetch {
    return this.configuration.fetchImpl ?? fetch;
  }

  protected getDPoPNonceCacheKey (request: Request): string {
    const url = new URL(request.url);
    return `${url.hostname}${url.pathname}`;
  }

  protected getDPoPNonceFromCache (request: Request): Promise<string | undefined> {
    return this.dpopNonceCache.getNonce(this.getDPoPNonceCacheKey(request));
  }

  protected async cacheDPoPNonce (request: Request, nonce: string): Promise<void> {
    await this.dpopNonceCache.cacheNonce(this.getDPoPNonceCacheKey(request), nonce);
  }

  /**
   * Registers an {@link APIClient.RequestInterceptor} on the {@link APIClient}
   * 
   * @example
   * const interceptor = (request: Request) => {
   *   req.headers.append('foo', '1');
   *   return req;
   * };
   * client.addInterceptor(interceptor);
   */
  public addInterceptor (interceptor: APIClient.RequestInterceptor) {
    this.interceptors.push(interceptor);
  }

  /**
   * Unregisters an {@link APIClient.RequestInterceptor} on the {@link APIClient}
   * 
   * @example
   * const interceptor = (request: Request) => { ... };
   * client.addInterceptor(interceptor);
   * ...
   * client.removeInterceptor(interceptor);
   */
  public removeInterceptor (interceptor: APIClient.RequestInterceptor) {
    const idx = this.interceptors.findIndex(i => i === interceptor);
    if (idx >= 0) {
      this.interceptors.splice(idx, 1);
    }
  }

  protected async applyInterceptors (request: APIRequest): Promise<Request> {
    let req = request;

    for (const interceptor of this.interceptors) {
      // ensures `req` has a value, in case an interceptor fails to return a `Request` instance
      req = await interceptor(req);
    }

    return req;
  }

  protected abstract checkForDPoPNonceErrorResponse (response: Response): Promise<string | undefined>;

  protected abstract prepareDPoPNonceRetry (request: APIRequest, nonce: string): Promise<void>;

  protected async processResponse (response: Response, request: APIRequest): Promise<void> {
    assertReadableResponse(response);

    const nonce = response.headers.get('dpop-nonce');
    if (nonce) {
      await this.cacheDPoPNonce(request, nonce);
    }
  }

  protected async processErrorResponse (response: Response, request: APIRequest): Promise<Response> {
    if (response.ok) {
      return response;
    }
    
    const dpopNonce = await this.checkForDPoPNonceErrorResponse(response);
    if (dpopNonce) {
      await this.prepareDPoPNonceRetry(request, dpopNonce);
      request.context.dpopNonce = dpopNonce;
      return this.retry(request);
    }

    // TODO: parse and throw www-authenticate headers as errors?

    return response;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async authorize (request: APIRequest): Promise<void> {
    // placeholder method, expected to be overwritten by derived classes, if needed
    throw new APIClientError('Unable to authorize request. `authorize` method has not been implemented');
  }

  // separates the actual execution of `fetch` from .send() to ease class extensions (to utilize XHR for example)
  protected async sendRequest (request: Request): Promise<Response> {
    const fetchFn = this.#fetch;
    return await fetchFn(request);
  }

  protected async send (request: APIRequest): Promise<Response> {
    const { authorizeRequest } = { ...this.defaultRequestOptions, ...request.context };
    const shouldAuthorize: boolean = typeof authorizeRequest === 'function' ? authorizeRequest(request) : authorizeRequest;

    if (shouldAuthorize) {
      if (this.configuration.dpop) {
        // assign dpopNonce from cache, if not provided
        request.context.dpopNonce ??= await this.getDPoPNonceFromCache(request);
      }

      await this.authorize(request);
    }

    // appends okta user agent
    mergeHeaders(request.headers, this.defaultHeaders);

    const toSend: Request = await this.applyInterceptors(request.clone());
    if (toSend.bodyUsed) {
      throw new APIClientError('Provided request was already used');
    }
    this.emitter.emit('will_send', { request: toSend.clone() });

    let response: Response;
    try {
      response = await this.sendRequest(toSend);
    }
    catch (err) {
      if (APIClient.isNetworkError(err)) {
        const error = new APIClientError('Network failure: request failed to send');
        // `isNetworkError()` confirms `err` is of type `Error`
        this.emitter.emit('network_failure', { request: toSend, error, cause: err as Error });
        throw error;
      }
      throw err;
    }

    this.emitter.emit('did_send', { request: toSend, response: response.clone() });

    await this.processResponse(response, request);
    if (!response.ok) {
      return this.processErrorResponse(response, request);
    }

    return response;
  }

  protected async retry (request: APIRequest): Promise<Response> {
    request.markRetry();
    request.headers.delete('X-Okta-User-Agent-Extended');   // prevents collisions during retry attempts
    return await this.send(request);
  }

  protected getRetryDelay (response: Response, request: APIRequest): number {
    if (response.headers.get('retry-after')) {
      const retryAfter = parseInt(response.headers.get('retry-after')!, 10) * 1000;
      return retryAfter;
    }

    return Math.pow(2, request.retryAttempt) * 1000;
  }

  public async fetch (...args: ConstructorParameters<typeof APIRequest>): Promise<Response> {
    const request = new APIRequest(...args);
    return this.send(request);
  }
}

/**
 * @group APIClient
 */
export namespace APIClient {
  export type ConfigurationParams = {
    // authentication?: ClientAuthentication;
    dpop?: boolean;
    fetchImpl?: typeof fetch
  };

  export class Configuration implements JSONSerializable {
    public dpop: boolean = false;
    public fetchImpl?: typeof fetch;

    public static DefaultOptions: { dpop: boolean, fetchImpl?: typeof fetch } = {
      dpop: false,
    } satisfies APIClient.ConfigurationParams;    // using `satisfies` to maintain parity between types

    constructor (params: APIClient.ConfigurationParams) {
      const { dpop, fetchImpl } = { ...Configuration.DefaultOptions, ...params };

      this.dpop = dpop ?? false;
      this.fetchImpl = fetchImpl;
    }

    toJSON (): JsonRecord {
      const { dpop } = this;
      return {
        dpop
      };
    }
  }

  export type RequestOptions = {
    /**
     * When `true`, utilizes the provided {@link TokenOrchestrator} to acquire an access token to sign the outgoing request with the proper
     * `Authorization` and `Dpop` headers, depending on the {@link TokenType} of the acquired {@link Token}. Defaults to `true`
     */
    authorizeRequest: boolean | ((request: APIRequest) => boolean);
  };

  export type RequestInterceptor = (request: APIRequest) => (Promise<APIRequest> | APIRequest);

  export type Events = {
    /**
     * Fired before a request is sent
     *
     * @remarks
     * The `request` instance is `readonly`. For outgoing request customization see {@link APIClient.addInterceptor}
     */
    'will_send': { request: Request },
    /**
     * Fired after a response is received
     */
    'did_send': { request: Request, response: Response },
    /**
     * Fired after a {@link fetch} call fails to complete (`TypeError: Failed to fetch`)
     */
    'network_failure': { request: Request, error: APIClientError, cause: Error }
  };

  export function isNetworkError (err: unknown): boolean {
    return err instanceof Error && (
      err.message === 'Load failed' ||      // iOS / Safari
      err.message === 'Failed to fetch'     // Other browsers
    );
  }
}
