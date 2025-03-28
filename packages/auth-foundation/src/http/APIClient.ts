import { DPoPNonceCache } from '../oauth2/dpop/nonceCache';
import { getOktaUserAgent } from './oktaUserAgent';
import { mergeHeaders } from '../utils';
import { Codable } from '../types';
import { mCodable } from '../internals/mixins/Codable';
import { validateURL } from '../internals/validators';

export * from './requests/OAuth2Request';


function assertReadableResponse(response: Response) {
  if (response.bodyUsed) {
    throw new TypeError('"response" body has been used already');
  }
}

export type APIRequestInit = RequestInit & { context?: Record<string, any> };

export class APIRequest extends Request {
  static MaxRetryAttempts = 2;

  #retriesRemaining: number = APIRequest.MaxRetryAttempts;
  readonly context: Record<string, any>;

  constructor (input: string | URL | Request, init: APIRequestInit = {}) {
    const { context, ...requestInit } = init;
    super(input, input instanceof Request ? undefined : requestInit);
    this.context = context ?? {};
  }

  get retryAttempt () {
    return APIRequest.MaxRetryAttempts - this.#retriesRemaining;
  }

  canRetry (): boolean {
    return this.#retriesRemaining > 0;
  }

  markRetry (): void {
    this.#retriesRemaining--;
  }

  clone (): APIRequest {
    const clone = new APIRequest(super.clone(), { context: this.context });
    clone.#retriesRemaining = this.#retriesRemaining;
    return clone;
  }
}

export abstract class APIClient {
  readonly configuration: any;
  protected readonly fetchImpl?: typeof fetch;
  protected readonly dpopNonceCache: DPoPNonceCache = new DPoPNonceCache.InMemoryCache();
  defaultHeaders = { 'X-Okta-User-Agent-Extended': getOktaUserAgent() };

  constructor (options: APIClient.Options = {}) {
    this.fetchImpl = options?.fetchImpl;
  }

  get baseURL (): URL {
    return this.configuration.baseURL;
  }

  get #fetch (): typeof fetch {
    return this.fetchImpl ?? fetch;
  }

  protected getDPoPNonceCacheKey (request: Request): string {
    const url = new URL(request.url);
    return `${url.hostname}${url.pathname}`;
  }

  protected getDPoPNonceFromCache (request: Request): string | undefined {
    return this.dpopNonceCache.getNonce(this.getDPoPNonceCacheKey(request));
  }

  protected cacheDPoPNonce (request: Request, nonce: string): void {
    this.dpopNonceCache.cacheNonce(this.getDPoPNonceCacheKey(request), nonce);
  }

  protected abstract checkForDPoPNonceErrorResponse (response: Response): Promise<string | undefined>;

  protected abstract prepareDPoPNonceRetry (request: APIRequest, nonce: string): Promise<APIRequest>;

  // method is async for future-proofing
  protected async processResponse (response: Response, request: APIRequest): Promise<void> {
    assertReadableResponse(response);

    const nonce = response.headers.get('dpop-nonce');
    if (nonce) {
      this.cacheDPoPNonce(request, nonce);
    }
  }

  protected async processErrorResponse (response: Response, request: APIRequest): Promise<Response> {
    if (response.ok) {
      return response;
    }
    
    const dpopNonce = await this.checkForDPoPNonceErrorResponse(response);
    if (dpopNonce) {
      await this.prepareDPoPNonceRetry(request, dpopNonce);
      return this.retry(request);
    }

    // TODO: parse and throw www-authenticate headers as errors?

    return response;
  }

  // separates the actual execution of `fetch` from .send() to ease class extensions (to utilize XHR for example)
  protected async sendRequest (request: APIRequest): Promise<Response> {
    const fetchFn = this.#fetch;
    return await fetchFn(request);
  }

  protected async send (req: Request | APIRequest, context: Record<string, any> = {}): Promise<Response> {
    const request = req instanceof APIRequest ? req : new APIRequest(req, { context });

    // appends okta user agent
    mergeHeaders(request.headers, this.defaultHeaders);

    const response = await this.sendRequest(request.clone());

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

  public async fetch (input: string | URL | Request, init?: RequestInit): Promise<Response> {
    const request = input instanceof Request ? input : new Request(input, init);
    return this.send(request);
  }
}

export namespace APIClient {
  export type Options = {
    fetchImpl?: typeof fetch
  };

  export type ConfigurationParams = {
    baseURL: URL | string;
    // authentication?: ClientAuthentication;
    dpop?: boolean;
  };

  export class Configuration extends mCodable(
    class Configuration {
      public baseURL: URL;
      public dpop: boolean = false;

      constructor (params: APIClient.ConfigurationParams) {
        const { baseURL, dpop } = params;
        if (!validateURL(baseURL)) {
          throw new TypeError('Invalid baseURL');
        }

        this.baseURL = new URL(baseURL);
        this.dpop = dpop ?? false;
      }
  
      toJSON (): Record<string, unknown> {
        const { baseURL, dpop } = this;
        return {
          baseURL: baseURL.href,
          dpop
        };
      }
    }
  ) implements Codable {}
}
