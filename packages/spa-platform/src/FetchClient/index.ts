import {
  FetchClient as FetchClientBase,
  type DPoPNonceCache
} from '@okta/auth-foundation';
import { PersistentCache } from '../platform/dpop/index.ts';

/**
 * @module FetchClient
 */


/**
 * Wrapper around {@link fetch} to perform authenticated requests to a resource server
 * 
 * The provided {@link TokenOrchestrator} is used to retrieve a {@link Token} which matches the criteria passed in via
 * {@link TokenOrchestrator.AuthorizeParams}, like `issuer`, `client` and `scopes`. Once a valid {@link Token} is found, the request is made
 */
export class FetchClient extends FetchClientBase {
  protected readonly dpopNonceCache: DPoPNonceCache = new PersistentCache('okta-dpop-nonce');
}
