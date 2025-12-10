/**
 * @module
 * @mergeModuleWith Core
 */

import { randomBytes, type JsonRecord } from '@okta/auth-foundation';
import { AuthContext } from './types.ts';


export interface TransactionStorage {
  get (key: string): Promise<JsonRecord | undefined>
  add (key: string, item: JsonRecord): Promise<void>;
  remove (key: string): Promise<void>;
}

/**
 * @internal
 * In memory storage of authentication transactions. Not necessarily intended for production use!
 */
export class DefaultTransactionStorage implements TransactionStorage {
  #cache: Map<string, JsonRecord> = new Map();

  async get (key: string): Promise<JsonRecord | undefined> {
    return this.#cache.get(key);
  }

  async add (key: string, item: JsonRecord): Promise<void> {
    this.#cache.set(key, item);
  }

  async remove (key: string): Promise<void> {
    this.#cache.delete(key);
  }

  get size () {
    return this.#cache.size;
  }
}

/** @internal */
export class AuthTransaction {
  context: AuthContext = {};
  static storage: TransactionStorage = new DefaultTransactionStorage();

  constructor (initialContext = {}) {
    this.context = {...initialContext};
    if (!this.state) {
      this.context.state = randomBytes();
    }
  }

  get state () {
    return this.context.state;
  }

  async save () {
    await AuthTransaction.storage.add(this.state, this.context);
  }

  async delete () {
    await AuthTransaction.storage.remove(this.state);
  }

  static async load (state: string): Promise<AuthContext | null> {
    const transaction = await AuthTransaction.storage.get(state);
    return transaction ?? null;
  }

  static async remove (state: string) {
    await AuthTransaction.storage.remove(state);
  }
}
