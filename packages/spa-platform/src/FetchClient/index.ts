import {
  pause,
  WWWAuth,
  APIClient,
  APIRequest,
  APIClientError
} from '@okta/auth-foundation';
import { TokenOrchestrator } from '../TokenOrchestrator';


/**
 * @module FetchClient
 */

/**
 * Wrapper around [fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) to perform authenticated requests
 * to a resource server
 * 
 * The provided {@link TokenOrchestrator} is used to retrieve {@link Token}s which match the criteria passed in via
 * {@link TokenOrchestrator.OAuth2Params}, like `issuer`, `client` and `scopes`. Once a valid {@link Token} is found, the request is made
 */
export class FetchClient extends APIClient {
  constructor (
    private readonly orchestrator: TokenOrchestrator,
    options: APIClient.Options = {}
  ) {
    super(options);
  }

  // Resource servers return a 401 with www-authenticate and dpop-nonce headers
  // https://datatracker.ietf.org/doc/html/rfc9449#section-9
  protected async checkForDPoPNonceErrorResponse (response: Response): Promise<string | undefined> {
    const wwwAuthenticate = response.headers.get('www-authenticate');
    if (response.status === 401 && wwwAuthenticate) {
      const error = WWWAuth.parse(wwwAuthenticate);
      if (WWWAuth.isWWWAuthenticateError(error) && error.error === 'use_dpop_nonce') {
        const nonce = response.headers.get('dpop-nonce');
        if (nonce) {
          return nonce;
        }
        throw new APIClientError('DPoP nonce required, but none found');
      }
    }
  }

  protected async prepareDPoPNonceRetry(request: APIRequest, nonce: string): Promise<APIRequest> {
    await this.orchestrator.authorize(request, { dpopNonce: nonce });
    return request;
  }

  protected async processErrorResponse (response: Response, request: APIRequest): Promise<Response> {
    const res = await super.processErrorResponse(response, request);
    if (response !== res) {
      // don't handle error twice. If super.processErrorResponse handles the error,
      // a new response will be returned, therefore return it
      return res;
    }
    response = res;

    // TODO: handle acr_vaule error

    // http status-based retry attempts are gated by a counter to prevent infinite loops
    if (!response.ok && request.canRetry()) {
      switch (response.status) {
        case 401:
          await this.prepare401Retry(response, request);
          return this.retry(request);
        case 429:
          await this.prepare429Retry(response, request);
          return this.retry(request);
      }
    }

    return response;
  }

  protected async prepare401Retry (response: Response, request: APIRequest) {
    await this.orchestrator.authorize(request);
  }

  protected async prepare429Retry (response: Response, request: APIRequest) {
    await pause(this.getRetryDelay(response, request));
  }

  public async fetch (input: string | URL | Request, init: TokenOrchestrator.OAuth2Params & RequestInit = {}): Promise<Response> {
    const { issuer, clientId, scopes, ...fetchInit } = init;
    const authParams = { issuer, clientId, scopes };
    const request = input instanceof Request ? input : new Request(input, fetchInit);
    const dpopNonce = this.getDPoPNonceFromCache(request);
    await this.orchestrator.authorize(request, { ...authParams, dpopNonce });
    return super.send(request);
  }
}
