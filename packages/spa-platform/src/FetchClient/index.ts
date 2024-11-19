import { Token, EventEmitter } from '@okta/auth-foundation';
import { CredentialOrchestrator } from '../CredentialOrchestrator';


/**
 * @module FetchClient
 */

export type FetchClientAuthOptions = {
  issuer: string | URL;
  clientId: string;
  scopes: string[];
};

export type FetchClientOptions = FetchClientAuthOptions & {
  fetchImpl?: (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
  authType?: 'bearer' | 'dpop';
};

const defaultOptions = {
  fetchImpl: fetch,
  authType: 'bearer',
};

/**
 * Wrapper around [fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) to perform authenticated requests
 * to a resource server
 * 
 * The provided {@link CredentialOrchestrator} is used to retrieve {@link Token}s which match the criteria passed in via
 * {@link FetchClientAuthOptions}, like `issuer`, `client` and `scopes`. Once a valid {@link Token} is found, the request is made
 */
export class FetchClient {
  private readonly emitter = new EventEmitter();
  constructor (
    private readonly orchestrator: CredentialOrchestrator,
    private readonly options: FetchClientOptions
  ) {}

  on (eventName: string, handler: (event: any) => void) {
    return this.emitter.on(eventName, handler);
  }

  off (eventName: string, handler: (event: any) => void) {
    return this.emitter.off(eventName, handler);
  }

  // TODO: fix type -> input: string | URL | Request (when dpop is supported)
  public async fetch (input: string | URL, options: Partial<FetchClientOptions> & RequestInit = {}): Promise<Response> {
    const { issuer, clientId, scopes, fetchImpl, ...fetchInit } = { ...defaultOptions, ...this.options, ...options };
    const authOptions = { issuer, clientId, scopes };

    let request: Request;
    if (this.options.authType === 'dpop') {
      request = await this.orchestrator.getDPoPSignature({
        url: input,
        ...fetchInit,
        ...authOptions
      });
    }
    else {
      // use Bearer token strategy if dpop isn't required
      const token: Token | null = await this.orchestrator.getToken(authOptions);

      // token request failed (fetchToken), resource request cannot be made
      if (!token) {
        // TODO:
        throw new Error('foo');
      }

      request = await token.authorize(input, fetchInit);
    }

    try {
      let response = await fetchImpl(request);

      if (!response.ok) {

        // TODO: handle acr_vaule error

        // TODO: handle expired (or revoked) token (401)
        if (response.status === 401) {
          console.log(response);
        }
      }

      return response;
    }
    catch (err) {
      // TODO:
      console.log(err);
      throw err;
    }
  }
}
