import { randomBytes, JsonRecord } from '@okta/auth-foundation';
import { AuthContext } from './types';

/** @internal */
class TransactionStorageImpl implements TransactionStorage {
  constructor (private readonly keyPrefix: string) {}

  protected keyname(key: string) {
    return `${this.keyPrefix}:${key}`;
  }

  async getItem (key: string) {
    const itemStr = localStorage.getItem(this.keyname(key));
    return itemStr ? JSON.parse(itemStr) : null;
  }

  async setItem (key: string, item: JsonRecord) {
    const itemStr = JSON.stringify(item);
    localStorage.setItem(this.keyname(key), itemStr);
  }

  async removeItem (key: string) {
    localStorage.removeItem(this.keyname(key));
  }
}

// NOTE: making methods async for future-proofing
export interface TransactionStorage {
  getItem (key: string): Promise<JsonRecord | undefined>
  setItem (key: string, item: JsonRecord): Promise<void>;
  removeItem (key: string): Promise<void>;
}

/** @internal */
export class AuthTransaction {
  // increment this value if breaking changes to the JSON structure of a Token is required
  // allows the opportunity for transformers to be implemented
  private static version = 'v2';

  context: AuthContext = {};
  static storage = new TransactionStorageImpl(`at:${AuthTransaction.version}`);

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
    await AuthTransaction.storage.setItem(this.state, this.context);
  }

  async delete () {
    await AuthTransaction.storage.removeItem(this.state);
  }

  static load (state: string): Promise<AuthContext | null> {
    return AuthTransaction.storage.getItem(state) ?? null;
  }

  static async remove (state: string) {
    AuthTransaction.storage.removeItem(state);
  }
}
