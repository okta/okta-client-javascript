/**
 * @module
 * @mergeModuleWith Networking
 */

/**
 * Properties requried to construct an instance of {@link APIRequest}
 */
export type APIRequestInit = RequestInit & { context?: object };

/**
 * An extension of {@link !Request} to be used within {@link APIClient}.
 * 
 * Holds a request {@link APIRequest.context | context } and {@link APIRequest.retryAttempt | retry count}
 * 
 * @noInheritDoc
 */
export class APIRequest extends Request {
  /**
   * Maximum number of retries which are allowed to be attempted for a given {@link APIRequest}.
   * @defaultValue 2
   * 
   * @remarks
   * Changing this value will only effect `APIRequest`s created _afterwards_. It will have no effect
   * on any prexisting instances.
   */
  static MaxRetryAttempts = 2;

  #retriesRemaining: number = APIRequest.MaxRetryAttempts;
  /**
   * A map to store contextual information about the `APIRequest`, meaningful to the specific {@link APIClient}
   */
  readonly context: Record<string, any>;

  constructor (input: string | URL | Request, init: APIRequestInit = {}) {
    const { context, ...requestInit } = init;
    super(input, input instanceof Request ? undefined : requestInit);
    this.context = context ?? {};
  }

  get retryAttempt () {
    return APIRequest.MaxRetryAttempts - this.#retriesRemaining;
  }

  /**
   * Compares the retry counter to {@link APIRequest.MaxRetryAttempts}
   */
  canRetry (): boolean {
    return this.#retriesRemaining > 0;
  }

  /**
   * Increments retry counter
   */
  markRetry (): void {
    this.#retriesRemaining--;
  }

  /** @internal */
  clone (): APIRequest {
    const clone = new APIRequest(super.clone(), { context: this.context });
    clone.#retriesRemaining = this.#retriesRemaining;
    return clone;
  }
}
