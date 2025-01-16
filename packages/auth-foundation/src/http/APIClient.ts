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
  static DefaultMaxRetryAttempts = 2;

  #retriesRemaining: number = APIRequest.DefaultMaxRetryAttempts;
  readonly context: Record<string, any>;

  constructor (input: string | URL | Request, init: APIRequestInit = {}) {
    const { context, ...requestInit } = init;
    super(input, input instanceof Request ? undefined : requestInit);
    this.context = context ?? {};
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

  constructor (options: APIClient.Options = {}) {
    this.fetchImpl = options?.fetchImpl;
  }

  get baseURL (): URL {
    return this.configuration.baseURL;
  }

  get #fetch (): typeof fetch {
    return this.fetchImpl ?? fetch;
  }

  protected abstract checkForDPoPNonceErrorResponse (response: Response): Promise<string | undefined>;

  protected abstract prepareDPoPNonceRetry (request: APIRequest, nonce: string): Promise<APIRequest>;

  // method is async for future-proofing
  protected async processResponse (response: Response): Promise<void> {
    assertReadableResponse(response);
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

    return response;
  }

  protected async send (req: Request | APIRequest, context: Record<string, any> = {}): Promise<Response> {
    const request = req instanceof APIRequest ? req : new APIRequest(req, { context });

    // appends okta user agent
    mergeHeaders(request.headers, { 'X-Okta-User-Agent-Extended': getOktaUserAgent() });

    const fetchFn = this.#fetch;
    let response: Response;
    try {
      response = await fetchFn(request.clone());
    }
    catch (err) {
      // console.log(err);
      // TODO: FetchError
      throw new Error('FetchError');
    }

    await this.processResponse(response);
    if (!response.ok) {
      return this.processErrorResponse(response, request);
    }

    return response;
  }

  protected async retry (request: APIRequest): Promise<Response> {
    request.markRetry();
    request.headers.delete('X-Okta-User-Agent-Extended');   // prevents collisions during retry attempts
    return this.send(request);
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
