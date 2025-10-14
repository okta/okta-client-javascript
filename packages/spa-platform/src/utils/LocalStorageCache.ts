/**
 * @packageDocumentation
 * @internal
 */

import { Timestamp, type Json, type JsonPrimitive } from '@okta/auth-foundation';

/** @internal */
const _20_HOURS = 60 * 60 * 20;


/**
 * @internal
 * A `LocalStorage`-based cache, which holds items for a duration of time
 * in attempt to avoid orphaned records in `LocalStorage`
 */
export class LocalStorageCache<T extends Json | JsonPrimitive = string> {
  constructor (
    protected storageKey: string,
    protected expirationDuration: number = _20_HOURS,
    public clearOnParseError: boolean = true
  ) {}

  protected getStore (): Record<string, { item: T; ts: number }> {
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

  protected updateStore (store): void {
    // remove cache from localstorage if not items exist
    if (Object.keys(store).length === 0) {
      localStorage.removeItem(this.storageKey);
    }
    else {
      localStorage.setItem(this.storageKey, JSON.stringify(store));
    }
  }

  public add (key: string, item: T): void {
    const store = this.getStore();
    // TODO: consider using TimeCoordinator
    store[key] = { item, ts: Date.now() / 1000 };
    this.updateStore(store);
  }

  public get (key: string): T | null {
    const store = this.getStore();
    return store[key]?.item ?? null;
  }

  public remove (key: string): void {
    const store = this.getStore();
    if (store[key]) {
      delete store[key];
    }
    this.updateStore(store);
  }

  public clear (): void{
    localStorage.removeItem(this.storageKey);
  }
}
