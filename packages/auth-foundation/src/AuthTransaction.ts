import { randomBytes } from './crypto';
import { AuthContext } from './AuthContext';

// TODO: temporary impl
/** @internal */
class TransactionStorage {
  constructor (private readonly keyPrefix: string) {}

  protected keyname(key: string) {
    return `${this.keyPrefix}:${key}`;
  }

  getItem (key: string) {
    const itemStr = localStorage.getItem(this.keyname(key));
    return itemStr ? JSON.parse(itemStr) : null;
  }

  setItem (key: string, item: object) {
    const itemStr = JSON.stringify(item);
    localStorage.setItem(this.keyname(key), itemStr);
  }

  removeItem (key: string) {
    localStorage.removeItem(this.keyname(key));
  }
}

/** @internal */
export class AuthTransaction {
  context: AuthContext = {};
  private static storage = new TransactionStorage('at');

  constructor (initialContext = {}) {
    this.context = {...initialContext};
    if (!this.state) {
      this.context.state = randomBytes();
    }
  }

  get state () {
    return this.context.state;
  }

  save () {
    AuthTransaction.storage.setItem(this.state, this.context);
  }

  clear () {
    AuthTransaction.storage.removeItem(this.state);
  }

  static load (state: string): AuthContext {
    return AuthTransaction.storage.getItem(state);
  }

  static remove (state: string): void {
    AuthTransaction.storage.removeItem(state);
  }
}
