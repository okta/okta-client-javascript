import type { JsonRecord } from '@okta/auth-foundation';
import type { TransactionStorage } from '@okta/oauth2-flows';
import { LocalStorageCache } from '../utils/LocalStorageCache.ts';


export class BrowserTransactionStorage implements TransactionStorage {
  // increment this value if breaking changes to the JSON structure is required
  // allows the opportunity for transformers to be implemented
  private static version = 'v2';

  #cache: LocalStorageCache<JsonRecord> = new LocalStorageCache(`okta-auth:${BrowserTransactionStorage.version}`);

  async get (key: string): Promise<JsonRecord | undefined> {
    return this.#cache.get(key) ?? undefined;
  }

  async add (key: string, item: JsonRecord): Promise<void> {
    this.#cache.add(key, item);
  }

  async remove (key: string): Promise<void> {
    this.#cache.remove(key);
  }
}
