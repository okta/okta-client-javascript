import { APIClient, APIRequest, WWWAuth } from './http/index.ts';
import { TokenOrchestrator } from './TokenOrchestrator.ts';
import { APIClientError } from './errors/index.ts';
import { pause } from './utils/index.ts';


/**
 * @module FetchClient
 */


/**
 * Wrapper around [fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) to perform authenticated requests
 * to a resource server
 *
 * The provided {@link TokenOrchestrator} is used to retrieve {@link Token}s which match the criteria passed in via
 * {@link TokenOrchestrator.AuthorizeParams}, like `issuer`, `client` and `scopes`. Once a valid {@link Token} is found, the request is made
 */
export class FetchClient extends APIClient {

  constructor (
    private readonly orchestrator: TokenOrchestrator,
    ...[params]: ConstructorParameters<typeof APIClient>
  ) {
    super(params);
  }

  /**
   * default options
   */
  defaultRequestOptions: APIClient.RequestOptions = { authorizeRequest: true };

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

  protected async prepareDPoPNonceRetry(request: APIRequest, nonce: string): Promise<void> {
    request.context.dpopNonce = nonce;
    // super.send() will sign call .authorize()
  }

  protected async prepareAcrStepUpRetry (response: Response, request: APIRequest, error: WWWAuth.WWWAuthenticateError) {
    const params = {
      ...(request.context ?? {}),
      acrValues: error['acr_values'],
      ...( error['max_age'] && { maxAge: parseInt(error['max_age'], 10) })
    };

    Object.assign(request.context, params);
  }

  protected async processErrorResponse (response: Response, request: APIRequest): Promise<Response> {
    const res = await super.processErrorResponse(response, request);
    if (response !== res) {
      // don't handle error twice. If super.processErrorResponse handles the error,
      // a new response will be returned, therefore return it
      return res;
    }
    response = res;

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
    // acr_value step up retry
    const wwwAuthError = WWWAuth.parse(response);
    if (wwwAuthError && wwwAuthError.error === 'insufficient_user_authentication') {
      await this.prepareAcrStepUpRetry(response, request, wwwAuthError);
    }

    // super.send() will sign call .authorize()
  }

  protected async prepare429Retry (response: Response, request: APIRequest) {
    await pause(this.getRetryDelay(response, request));
  }

  protected async authorize (request: APIRequest): Promise<void> {
    const { authParams, rest: { dpopNonce } } = TokenOrchestrator.extractAuthParams(request.context);
    await this.orchestrator.authorize(request, {...authParams, dpopNonce });
  }

  public async fetch (
    input: string | URL | Request,
    init: TokenOrchestrator.AuthorizeParams & RequestInit & Partial<APIClient.RequestOptions> = {}
  ): Promise<Response> {
    const { authParams, rest: { authorizeRequest, ...fetchInit } } = TokenOrchestrator.extractAuthParams(init);
    const context = { ...authParams, ...(authorizeRequest !== undefined && { authorizeRequest }) };
    return super.fetch(input, { ...fetchInit, context });
  }
}
