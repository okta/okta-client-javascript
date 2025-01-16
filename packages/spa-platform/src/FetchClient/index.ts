import {
  WWWAuth,
  APIClient,
  APIRequest
} from '@okta/auth-foundation';
import { TokenOrchestrator } from '../TokenOrchestrator';


/**
 * @module FetchClient
 */

export type FetchClientInit = {
  fetchImpl: (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
}

/**
 * Wrapper around [fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) to perform authenticated requests
 * to a resource server
 * 
 * The provided {@link CredentialOrchestrator} is used to retrieve {@link Token}s which match the criteria passed in via
 * {@link TokenOrchestrator.OAuth2Params}, like `issuer`, `client` and `scopes`. Once a valid {@link Token} is found, the request is made
 */
export class FetchClient extends APIClient {
  constructor (
    private readonly orchestrator: TokenOrchestrator,
    private readonly options: FetchClientInit = { fetchImpl: fetch }
  ) {
    super();
  }

  // Resource servers return a 401 with www-authenticate and dpop-nonce headers
  // https://datatracker.ietf.org/doc/html/rfc9449#section-9
  protected async checkForDPoPNonceErrorResponse (response: Response): Promise<string | undefined> {
    const wwwAuthenticate = response.headers.get('www-authenticate');
    if (response.status === 401 && wwwAuthenticate) {
      const error = WWWAuth.parse(wwwAuthenticate);
      if (WWWAuth.isWWWWAuthenticateError(error) && error.error === 'use_dpop_nonce') {
        const nonce = response.headers.get('dpop-nonce');
        if (nonce) {
          return nonce;
        }
        // TODO: throw if nonce is required but not returned?
      }
    }
  }

  protected async prepareDPoPNonceRetry(request: APIRequest, nonce: string): Promise<APIRequest> {
    await this.orchestrator.authorize(request, { dpopNonce: nonce });
    return request;
  }

  protected async processErrorResponse (response: Response, request: APIRequest): Promise<Response> {
    response = await super.processErrorResponse(response, request);

    // TODO: handle acr_vaule error

    // http status-based retry attempts are gated by a counter to prevent infinite loops
    if (request.canRetry()) {
      if (response.status === 401) {
        await this.orchestrator.authorize(request);
        return this.retry(request);
      }
      else if (response.status === 429) {
        // TODO: implement back-off approach?
        return this.retry(request);
      }
    }

    return response;
  }

  public async fetch (input: string | URL | Request, init: TokenOrchestrator.OAuth2Params & RequestInit = {}): Promise<Response> {
    const { fetchImpl, ...fetchInit } = { ...this.options, ...init };

    const request = await this.orchestrator.authorize(input, fetchInit);
    return this.send(request);
  }
}
