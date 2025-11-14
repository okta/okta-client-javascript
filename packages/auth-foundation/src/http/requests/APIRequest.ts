/**
 * @group APIClient
 */
export type APIRequestInit = RequestInit & { context?: object };

/**
 * @group APIClient
 */
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
