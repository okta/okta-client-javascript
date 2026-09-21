/**
 * @module
 * @mergeModuleWith Core
 */

import { randomBytes, type JsonRecord } from '@okta/auth-foundation/core';
import { AuthContext } from './types.ts';


/**
 * Persists contextual data across the redirect to and
 * from an Authorization Server, keyed by the transaction's `state` value
 */
export interface TransactionStorage {
  /** Retrieves the stored context for `key`, or `undefined` if none exists */
  get (key: string): Promise<JsonRecord | undefined>
  /** Stores `item` under `key`, overwriting any existing entry */
  add (key: string, item: JsonRecord): Promise<void>;
  /** Removes the entry stored under `key`, if any */
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

/**
 * @internal
 * Represents an in-progress flow's {@link AuthContext}, persisted to {@link AuthTransaction.storage}
 * across the redirect to and from an Authorization Server
 */
export class AuthTransaction {
  context: AuthContext = {};
  /** Storage implementation shared by all {@link AuthTransaction} instances */
  static storage: TransactionStorage = new DefaultTransactionStorage();

  /** Generates a `state` value for `initialContext` if one isn't already present */
  constructor (initialContext = {}) {
    this.context = {...initialContext};
    if (!this.state) {
      this.context.state = randomBytes();
    }
  }

  get state () {
    return this.context.state;
  }

  /** Persists {@link AuthTransaction.context} to {@link AuthTransaction.storage}, keyed by {@link AuthTransaction.state} */
  async save () {
    await AuthTransaction.storage.add(this.state, this.context);
  }

  /** Removes this transaction from {@link AuthTransaction.storage} */
  async delete () {
    await AuthTransaction.storage.remove(this.state);
  }

  /** Loads a previously-{@link AuthTransaction.save | saved} context by its `state` value */
  static async load (state: string): Promise<AuthContext | null> {
    const transaction = await AuthTransaction.storage.get(state);
    return transaction ?? null;
  }

  /** Removes the transaction stored under `state` */
  static async remove (state: string) {
    await AuthTransaction.storage.remove(state);
  }
}
