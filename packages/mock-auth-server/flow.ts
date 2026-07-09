import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


/**
 * Represents a mock response with status, body, and headers.
 */
export interface MockResponse {
  status: number;
  body?: any;
  headers?: Record<string, string>;
}

/**
 * Configuration options for the Flow class.
 */
export interface FlowConfig {
  /** Whether to cycle through responses or stay on the last one (default: false) */
  cycleResponses?: boolean;
}

/**
 * Represents a single OAuth2 endpoint with response sequences and request tracking.
 */
export class Endpoint {
  private path: string;
  private responses: MockResponse[];
  private requestCount: number = 0;
  private cycleResponses: boolean;

  /**
   * Create an endpoint with a path and response sequence(s).
   *
   * @param path - The endpoint path (e.g., '/oauth/authorize', '/oauth/token')
   * @param responses - A single response or array of responses to return in sequence
   * @param cycleResponses - Whether to cycle through responses or stay on the last one (default: false)
   */
  constructor(
    path: string,
    responses: MockResponse | MockResponse[],
    cycleResponses: boolean = false
  ) {
    this.path = path;
    this.responses = Array.isArray(responses) ? responses : [responses];
    this.cycleResponses = cycleResponses;

    if (this.responses.length === 0) {
      throw new Error('At least one response must be provided');
    }
  }

  /**
   * Handle a request to this endpoint and return the mock response.
   * Increments the request counter before determining which response to return.
   *
   * @returns The mock response for this request
   */
  handleRequest(): MockResponse {
    const responseIndex = this.cycleResponses
      ? this.requestCount % this.responses.length
      : Math.min(this.requestCount, this.responses.length - 1);

    const response = this.responses[responseIndex];
    this.requestCount++;

    return response;
  }

  /**
   * Get the number of requests received for this endpoint.
   *
   * @returns The request count
   */
  getRequestCount(): number {
    return this.requestCount;
  }

  /**
   * Get the endpoint path.
   *
   * @returns The endpoint path
   */
  getPath(): string {
    return this.path;
  }

  /**
   * Reset the request count to zero.
   */
  reset(): void {
    this.requestCount = 0;
  }
}

/**
 * Mock OAuth2 authorization server flow controller.
 * Orchestrates multiple endpoints and their response sequences.
 */
export class Flow {
  private endpoints: Map<string, Endpoint> = new Map();
  private config: Required<FlowConfig>;

  constructor(config?: FlowConfig) {
    this.config = {
      cycleResponses: config?.cycleResponses ?? false,
    };
  }

  /**
   * Register an endpoint with one or more mock responses.
   * Responses are returned in sequence as requests are received.
   *
   * @param endpoint - The endpoint path (e.g., '/oauth/authorize', '/oauth/token')
   * @param responses - A single response or array of responses
   */
  registerEndpoint(
    endpoint: string,
    responses: MockResponse | MockResponse[]
  ): void {
    this.endpoints.set(
      endpoint,
      new Endpoint(endpoint, responses, this.config.cycleResponses)
    );
  }

  /**
   * Handle a request to an endpoint and return the mock response.
   * Increments the request counter for the endpoint.
   *
   * @param endpoint - The endpoint path
   * @returns The mock response for this request
   */
  handleRequest(endpoint: string): MockResponse {
    const endpointHandler = this.endpoints.get(endpoint);

    if (!endpointHandler) {
      throw new Error(
        `Endpoint not registered: ${endpoint}. Call registerEndpoint() first.`
      );
    }

    return endpointHandler.handleRequest();
  }

  /**
   * Get the number of requests received for an endpoint.
   *
   * @param endpoint - The endpoint path
   * @returns The request count
   */
  getRequestCount(endpoint: string): number {
    return this.endpoints.get(endpoint)?.getRequestCount() ?? 0;
  }

  /**
   * Get all request counts.
   *
   * @returns A record of endpoint paths to request counts
   */
  getAllRequestCounts(): Record<string, number> {
    const result: Record<string, number> = {};

    for (const [path, endpoint] of this.endpoints) {
      result[path] = endpoint.getRequestCount();
    }

    return result;
  }

  /**
   * Check if an endpoint is registered.
   *
   * @param endpoint - The endpoint path
   * @returns True if the endpoint is registered
   */
  isEndpointRegistered(endpoint: string): boolean {
    return this.endpoints.has(endpoint);
  }

  /**
   * Get an endpoint handler by path.
   *
   * @param endpoint - The endpoint path
   * @returns The Endpoint instance, or undefined if not registered
   */
  getEndpoint(endpoint: string): Endpoint | undefined {
    return this.endpoints.get(endpoint);
  }

  /**
   * Reset the request count for an endpoint.
   *
   * @param endpoint - The endpoint path to reset, or undefined to reset all
   */
  reset(endpoint?: string): void {
    if (endpoint === undefined) {
      for (const ep of this.endpoints.values()) {
        ep.reset();
      }
    } else {
      this.endpoints.get(endpoint)?.reset();
    }
  }

  /**
   * Clear all registered endpoints and reset request counts.
   */
  clear(): void {
    this.endpoints.clear();
  }
}
