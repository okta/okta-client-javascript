/**
 * @module
 * @mergeModuleWith OAuth2
 */

import { DPoPError } from '../../errors/index.ts';

/**
 * @group DPoP
 */
export interface DPoPStorage {
  add (id: string, keyPair: CryptoKeyPair): Promise<void>
  get (id: string): Promise<CryptoKeyPair | null>;
  remove (id: string): Promise<void>;
  clear (): Promise<void>;
}

/**
 * @group DPoP
 * @internal
 */
export namespace DPoPStorage {
  /** @internal */
  export class MemoryStore implements DPoPStorage {
    #store: Map<string, CryptoKeyPair> = new Map();

    async add (id: string, keyPair: CryptoKeyPair): Promise<void> {
      if (this.#store.has(id)) {
        throw new DPoPError(`Duplicate: Key pair at id ${id} already exists`);
      }
      this.#store.set(id, keyPair);
    }

    async get (id: string): Promise<CryptoKeyPair | null> {
      return this.#store.get(id) ?? null;
    }

    async remove (id: string): Promise<void> {
      this.#store.delete(id);
    }

    async clear(): Promise<void> {
      this.#store.clear();
    }
  }
}
