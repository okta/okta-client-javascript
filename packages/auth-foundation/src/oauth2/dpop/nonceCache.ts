import TimeCoordinator, { Timestamp } from '../../utils/TimeCoordinator';

/** @internal */
const _20_HOURS = 60 * 60 * 20;

/**
 * @group DPoP
 */
export interface DPoPNonceCache {
  getNonce (key: string): string | undefined;
  cacheNonce (key: string, nonce: string): void;
  clear (): void;
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

    public getNonce (key: string): string | undefined {
      return this.#cache.get(key);
    }

    public cacheNonce (key: string, nonce: string): void {
      this.#cache.set(key, nonce);
    }

    public clear (): void {
      this.#cache.clear();
    }
  }

  /**
   * @internal
   * Implementation of persistent cache; backed via `LocalStorage`
   */
  export class PersistentCache implements DPoPNonceCache {
    constructor (
      public storageKey: string,
      public clearOnParseError: boolean = true
    ) {}

    private getStore (): Record<string, { nonce: string; ts: number }> {
      let store: Record<string, any> = {};
      try {
        store = JSON.parse(localStorage.getItem(this.storageKey) ?? '{}');
      }
      catch (err) {
        // If JSON.parse throws a parsing error (SyntaxError)
        // remove the store from storage since it can't be parsed
        // and therefore is most likely corrupted in some way
        if (err instanceof SyntaxError && this.clearOnParseError) {
          this.clear();
        }
        return {};
      }

      // remove any entry older than 20 hours from the store, as it's likely expired
      for (const [key, value] of Object.entries(store)) {
        // cast as `any` because .entries assumes type is `unknown`
        const ts = (value as any).ts;
        if (!ts || Math.abs(Timestamp.from(ts).timeSinceNow()) > _20_HOURS) {
          delete store[key];
        }
      }

      return store;
    }

    public getNonce (key: string): string | undefined {
      const store = this.getStore();
      return store[key]?.nonce ?? undefined;
    }

    public cacheNonce (key: string, nonce: string): void {
      const store = this.getStore();
      store[key] = { nonce, ts: TimeCoordinator.now().value };
      localStorage.setItem(this.storageKey, JSON.stringify(store));
    }

    clear (): void {
      localStorage.removeItem(this.storageKey);
    }
  }

}
