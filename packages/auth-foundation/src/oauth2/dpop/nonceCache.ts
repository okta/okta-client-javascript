/**
 * @module
 * @mergeModuleWith OAuth2
 */

/**
 * > The intent is that clients need to keep only one nonce value and 
 * servers need to keep a window of recent nonces.
 * 
 * via https://datatracker.ietf.org/doc/html/rfc9449#section-8
 * 
 * Authorization servers may provide the same `dpop-nonce` value for a window of time.
 * The `DPoPNonceCache` serves as a cache of these nonce values to avoid unnecessary
 * failures. {@link OAuth2.DPoPSigningAuthority.sign | DPoPSigningAuthority.sign} will 
 * use nonce values from the cache when available.
 *
 * @remarks
 * A `DPoPNonceCache` instance will be create for each {@link Networking.APIClient | APIClient} instance,
 * but `DPoPNonceCache` implementations will often share a common store
 * 
 * @group DPoP
 * @see
 * * {@link https://datatracker.ietf.org/doc/html/rfc9449#section-11.3 | RFC 9449 - DPoP Nonce Downgrade}
 * * {@link https://datatracker.ietf.org/doc/html/rfc9449#section-8 | RFC 9449 - Authorization Server-Provided Nonce}
 * * {@link https://datatracker.ietf.org/doc/html/rfc9449#section-9 | RFC 9449 - Resource Server-Provided Nonce}
 */
export interface DPoPNonceCache {
  getNonce (key: string): Promise<string | undefined>;
  cacheNonce (key: string, nonce: string): Promise<void>;
  clear (): Promise<void>;
}

/**
 * @internal
 */
export namespace DPoPNonceCache {

  /**
   * @internal
   * Implementation of an in-memory cache; backed via `Map`
   */
  export class InMemoryCache implements DPoPNonceCache {
    #cache: Map<string, string> = new Map();

    public async getNonce (key: string): Promise<string | undefined> {
      return this.#cache.get(key);
    }

    public async cacheNonce (key: string, nonce: string): Promise<void> {
      this.#cache.set(key, nonce);
    }

    public async clear (): Promise<void> {
      this.#cache.clear();
    }
  }

}
