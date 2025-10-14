/**
 * @packageDocumentation
 * @internal
 */

import { DPoPNonceCache } from '@okta/auth-foundation';
import { LocalStorageCache } from '../../utils/LocalStorageCache.ts';

/** @internal */
const _20_HOURS = 60 * 60 * 20;


/**
 * @internal
 * Implementation of persistent cache; backed via `LocalStorage`
 */
export class PersistentCache implements DPoPNonceCache {
  readonly #cache: LocalStorageCache<string>;

  constructor (storageKey: string, clearOnParseError: boolean = true) {
    this.#cache = new LocalStorageCache(storageKey, _20_HOURS, clearOnParseError);
  }

  public async getNonce (key: string): Promise<string | undefined> {
    return this.#cache.get(key) ?? undefined;
  }

  public async cacheNonce (key: string, nonce: string): Promise<void> {
    this.#cache.add(key, nonce);
  }

  public async clear (): Promise<void> {
    this.#cache.clear();
  }
}