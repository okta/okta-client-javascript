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
import { Platform } from '../platform/Platform.ts';

export * from './requests/APIRequest.ts';
export * from './requests/OAuth2Request.ts';


/** @internal */
function assertReadableResponse(response: Response) {
  if (response.bodyUsed) {
    throw new TypeError('"response" body has been used already');
  }
}

/**
 * Generic HTTP client with built in request retry
 * @typeParam E - Map of all events fired from {@link APIClient.emitter}
 * 
 * @example
 * To add an event within a derived class, first extend {@link APIClient.Events}, like so:
 * ```ts
 * type MyAPIEvents = { 'foo': { bar: number } } & APIClient.Events;
 * 
 * class MyAPIClient<E extends MyAPIEvents = MyAPIEvents> extends APIClient<E> {
 *   protected async send (request: APIRequest): Promise<Response> {
 *     // this will be properly type checked
 *     this.emitter('foo', { bar: 1 });
 *     return super.send(request);
 *   }
 * }
 * ```
 * 
 * @remarks Most application developers won't need to extend this class directly — reach for
 * {@link OAuth2.OAuth2Client | OAuth2Client} or {@link FetchClient} instead
 */
export abstract class APIClient<E extends APIClient.Events = APIClient.Events> {
  readonly configuration: APIClient.Configuration;
  /**
   * Possible events: {@link APIClient.Events}
   */
  readonly emitter: EventEmitter<E> = new EventEmitter();
  /**
   * A cache of `dpop-nonce` values returned by authorization or resource servers.
   * The cached nonce values will be used when generating DPoP JWTs for outgoing requests.
   * @remarks Only relevant if client is configured with `dpop: true`
   */
  protected readonly dpopNonceCache: DPoPNonceCache;
  /** @internal */
  protected readonly interceptors: APIClient.RequestInterceptor[] = [];

  /** Map of HTTP headers to apply to every request */
  defaultHeaders: Record<string, string> = { 'X-Okta-User-Agent-Extended': getOktaUserAgent() };
  /** Default {@link APIClient.RequestOptions} to apply to every request */
  defaultRequestOptions: APIClient.RequestOptions = { authorizeRequest: false };

  constructor (params: APIClient.ConfigurationParams | APIClient.Configuration = {}) {
    this.configuration = params instanceof APIClient.Configuration ? params : new APIClient.Configuration(params);
    this.dpopNonceCache = Platform.DPoPNonceCache;
  }

  get #fetch (): typeof fetch {
    return this.configuration.fetchImpl ?? fetch;
  }

  /**
   * Returns a key for a giving request to store or retrieve nonce values from the {@link APIClient.dpopNonceCache}
   * @group DPoP
   */
  protected getDPoPNonceCacheKey (request: Request): string {
    const url = new URL(request.url);
    return `${url.hostname}${url.pathname}`;
  }

  /**
   * Retrieves a nonce value from the {@link APIClient.dpopNonceCache}
   * @group DPoP
   */
  protected getDPoPNonceFromCache (request: Request): Promise<string | undefined> {
    return this.dpopNonceCache.getNonce(this.getDPoPNonceCacheKey(request));
  }

  /**
   * Caches an incoming nonce value from the {@link APIClient.dpopNonceCache}
   * @group DPoP
   */
  protected async cacheDPoPNonce (request: Request, nonce: string): Promise<void> {
    await this.dpopNonceCache.cacheNonce(this.getDPoPNonceCacheKey(request), nonce);
  }

  /**
   * Registers an {@link APIClient.RequestInterceptor} on the {@link APIClient}
   * 
   * @example
   * ```ts
   * const interceptor = (request: Request) => {
   *   req.headers.append('foo', '1');
   *   return req;
   * };
   * client.addInterceptor(interceptor);
   * ```
   *  @group Interceptors
   */
  public addInterceptor (interceptor: APIClient.RequestInterceptor) {
    this.interceptors.push(interceptor);
  }

  /**
   * Unregisters an {@link APIClient.RequestInterceptor} on the {@link APIClient}
   * 
   * @example
   * ```ts
   * const interceptor = (request: Request) => { ... };
   * client.addInterceptor(interceptor);
   * ...
   * client.removeInterceptor(interceptor);
   * ```
   * @group Interceptors
   */
  public removeInterceptor (interceptor: APIClient.RequestInterceptor) {
    const idx = this.interceptors.findIndex(i => i === interceptor);
    if (idx >= 0) {
      this.interceptors.splice(idx, 1);
    }
  }

  /**
   * @group Interceptors
   * @internal
   */
  protected async applyInterceptors (request: APIRequest): Promise<Request> {
    let req = request;

    for (const interceptor of this.interceptors) {
      // ensures `req` has a value, in case an interceptor fails to return a `Request` instance
      req = await interceptor(req);
    }

    return req;
  }

  /**
   * Determines if a {@link !Response} indicates a DPoP nonce error. If error is present, returns
   * the value of the `dpop-nonce` response header.
   * 
   * @group DPoP
   * @remarks
   * * {@link OAuth2.OAuth2Client} provides an authorization server-provided nonce implementation
   * * {@link FetchClient} provides an resource server-provided nonce implementation
   * 
   * @see
   * * {@link https://datatracker.ietf.org/doc/html/rfc9449#section-11.3 | RFC 9449 - DPoP Nonce Downgrade}
   * * {@link https://datatracker.ietf.org/doc/html/rfc9449#section-8 | RFC 9449 - Authorization Server-Provided Nonce}
   * * {@link https://datatracker.ietf.org/doc/html/rfc9449#section-9 | RFC 9449 - Resource Server-Provided Nonce}
   */
  protected abstract checkForDPoPNonceErrorResponse (response: Response): Promise<string | undefined>;

  /**
   * Prepares an {@link APIRequest} for a retry with a new `dpop-nonce` value
   * 
   * @group DPoP
   * 
   * @see
   * * {@link APIClient.checkForDPoPNonceErrorResponse}
   * * {@link https://datatracker.ietf.org/doc/html/rfc9449#section-8 | RFC 9449 - Authorization Server-Provided Nonce}
   * * {@link https://datatracker.ietf.org/doc/html/rfc9449#section-9 | RFC 9449 - Resource Server-Provided Nonce}
   */
  protected abstract prepareDPoPNonceRetry (request: APIRequest, nonce: string): Promise<void>;

  /**
   * Called on every {@link !Response} received.
   */
  protected async processResponse (response: Response, request: APIRequest): Promise<void> {
    assertReadableResponse(response);

    const nonce = response.headers.get('dpop-nonce');
    if (nonce) {
      await this.cacheDPoPNonce(request, nonce);
    }
  }

  /**
   * Called on every {@link !Response} where `response.ok` is `false`
   * 
   * @example
   * When processing a {@link !Response}, `processErrorResponse` may invoke {@link APIClient.retry}. Therefore, when extending
   * `APIClient` and calling `super.processErrorResponse` the same error condition could be handled twice erroneously.<br/>
   * To prevent this, check if the parameter `response` and the return value of `super.processErrorResponse` are equal (the
   * same {@link !Response} instance). If they are not equal, the `response` was already retried.
   * ```ts
   * class MyAPIClient extends APIClient {
   *   protected async processErrorResponse (response: Response, request: APIRequest): Promise<Response> {
   *     const res = await super.processErrorResponse(response, request);
   *     if (response !== res) {
   *       // response was already retried, return new `Response` instance.
   *       return res;
   *     }
   *     response = res;
   *
   *     // handle other scenarios here
   * 
   *     return response;
   *   }
   * }
   * ```
   */
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

  /**
   * @abstract
   * Signs an outgoing {@link APIRequest} with required authentication information.
   * 
   * This method is marked as `abstract` since not every API requires authentication.
   * 
   * @remarks
   * Most implementations of this method usually invoke {@link Token.Token.authorize | Token.authorize}
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async authorize (request: APIRequest): Promise<void> {
    // placeholder method, expected to be overwritten by derived classes, if needed
    throw new APIClientError('Unable to authorize request. `authorize` method has not been implemented');
  }

  /**
   * **Do not call directly** use {@link APIClient.send}.
   * 
   * This method provides an alternative means to provide a custom {@link fetch} implementation. By default,
   * this method invokes {@link APIClient.Configuration.fetchImpl | .fetchImpl} and falls back to `globalThis.fetch`
   * 
   * @example
   * ```ts
   * class MyAPIClient extends APIClient {
   *   protected sendRequest (request: Request): Promise<Response> {
   *     return customFetch(request);
   *   }
   * }
   * ```
   */
  protected async sendRequest (request: Request): Promise<Response> {
    const fetchFn = this.#fetch;
    return await fetchFn(request);
  }

  /**
   * Sends an outgoing {@link APIRequest} and processes the {@link !Response}.
   * 
   * @remarks
   * It's **NOT** recommended to override this method, as it contains the majority of the business logic
   */
  protected async send (request: APIRequest): Promise<Response> {
    // TODO: revisit this pattern - should APIRequest have a .options prop rather than using `context`?
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

  /**
   * Prepares a {@link APIRequest} for a retry attempt and sends the retry request. Usually invoked within
   * {@link APIClient.processErrorResponse}
   */
  protected async retry (request: APIRequest): Promise<Response> {
    request.markRetry();
    request.headers.delete('X-Okta-User-Agent-Extended');   // prevents collisions during retry attempts
    return await this.send(request);
  }

  /**
   * Calculates a delay to wait before retrying a {@link APIRequest} which previously responded with `429`.
   * Useful for rate limited APIs.
   */
  protected getRetryDelay (response: Response, request: APIRequest): number {
    if (response.headers.get('retry-after')) {
      const retryAfter = parseInt(response.headers.get('retry-after')!, 10) * 1000;
      return retryAfter;
    }

    return Math.pow(2, request.retryAttempt) * 1000;
  }

  /**
   * A `public` method to expose {@link APIClient.send}
   * @param args - matches call signature of {@link !fetch}
   * 
   * @example
   * ```ts
   * class MyAPIClient extends APIClient {...}
   * const client = new MyAPIClient();
   * 
   * async function fetchData () {
   *   return client.fetch('/foo');
   * }
   * ```
   */
  public async fetch (...args: ConstructorParameters<typeof APIRequest>): Promise<Response> {
    const request = new APIRequest(...args);
    return this.send(request);
  }
}


export namespace APIClient {
  /**
   * Options to provide to {@link Configuration} at instantiation
   */
  export type ConfigurationParams = {
    // authentication?: ClientAuthentication;
    dpop?: boolean;
    fetchImpl?: typeof fetch
  };

  export class Configuration implements JSONSerializable {
    /**
     * When `true`, client will utilize DPoP-bound tokens.
     * 
     * @remarks
     * Highly recommended feature; greatly improves security posture.
     * 
     * @see
     * {@link https://datatracker.ietf.org/doc/html/rfc9449 | DPoP RFC}
     */
    public dpop: boolean = false;
    /**
     * Implementation of {@link !fetch} used by the client. Defaults to `globalThis.fetch`.
     * 
     * @remarks
     * Providing a custom {@link !fetch} implementation can enable greater HTTP request customizations.
     */
    public fetchImpl?: typeof fetch;

    /**
     * @defaultValue
     * ```ts
     * { dpop: false }
     * ```
     */
    public static DefaultOptions: { dpop: boolean, fetchImpl?: typeof fetch } = {
      dpop: false,
    } satisfies APIClient.ConfigurationParams;    // using `satisfies` to maintain parity between types

    constructor (params: APIClient.ConfigurationParams) {
      const { dpop, fetchImpl } = { ...Configuration.DefaultOptions, ...params };

      this.dpop = dpop ?? false;
      this.fetchImpl = fetchImpl;
    }

    /**
     * Returns JSON representiation of {@link Configuration:class | Configuration}
     */
    toJSON (): JsonRecord {
      const { dpop } = this;
      return {
        dpop
      };
    }
  }

  /**
   * Options which control how an {@link APIClient} sends a request.
   */
  export type RequestOptions = {
    /**
     * Determines whether a {@link APIRequest} should invoke {@link APIClient.authorize} before sending. Defaults to `true`
     */
    authorizeRequest: boolean | ((request: APIRequest) => boolean);
  };

  /**
   * Function signature for {@link APIClient} request interceptors.
   */
  export type RequestInterceptor = (request: APIRequest) => (Promise<APIRequest> | APIRequest);

  /**
   * @interface
   * Map of events fired from {@link APIClient.emitter}
   * 
   * @example
   * ```ts
   * // key = Event name
   * // value = Event Type
   * client.emitter.on('will_send', ({ request }) => {
   *   console.log(request.url.href);
   * });
   * ```
   */
  export type Events = {
    /**
     * Fired before a request is sent
     *
     * @remarks
     * The `request` instance is `readonly`. For outgoing request customization see 
     * {@link Networking.APIClient.addInterceptor | APIClient.addInterceptor}
     */
    'will_send': { request: Request },
    /**
     * Fired after a response is received
     */
    'did_send': { request: Request, response: Response },
    /**
     * Fired after a {@link fetch} call fails to complete (no response is received).
     * Usually indicated via `TypeError: Failed to fetch`
     */
    'network_failure': { request: Request, error: APIClientError, cause: Error }
  };

  /**
   * Determines whether a value is an {@link !Error} indicating network connectivity problems when awaiting
   * a {@link !fetch} request.
   */
  export function isNetworkError (err: unknown): boolean {
    return err instanceof Error && (
      err.message === 'Load failed' ||      // iOS / Safari
      err.message === 'Failed to fetch'     // Other browsers
    );
  }
}
