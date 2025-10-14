/**
 * @module
 * @mergeModuleWith OAuth2
 */

/**
 * @group DPoP
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
