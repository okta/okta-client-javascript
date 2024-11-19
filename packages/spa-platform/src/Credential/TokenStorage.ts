import { EventEmitter, Token } from '@okta/auth-foundation';
import { CredentialError } from './errors';

/**
 * @public @interface
 * 
 * Defines interface for token storage. {@link Token} and {@link Token.Metadata} are treated as independent entities, which enables
 * them to be stored in different locations. This may be more relevant in mobile environments, where {@link Token} data can be
 * written to a secure location (which requires biometrics to access) and {@link Token.Metadata}, containing only non-sensitive info
 * can be stored in a more accessible location and used to query which tokens are available (without prompting biometrics)
 * 
 * @remarks
 * Default implementation provided based on {@link https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage | localStorage}
 */
export interface TokenStorage {
  readonly emitter: TokenStorageEventEmitter;
  /**
   * In memory cached value of the {@link Credential.default | default Credential}'s id
   */
  readonly defaultTokenId: string | null;
  /**
   * Updates the stored {@link Credential.default | default Credential} id
   */
  setDefaultTokenId (id: string | null): void;
  /**
   * Returns all {@link Token.id | Token ids} in storage
   */
  allIDs (): string[];
  /**
   * Writes a {@link Token} to storage
   * 
   * @param token - raw JSON representation of {@link Token}
   * @param metadata - non-sensitive data regarding the stored {@link Token} which will be used in storage queries
   */
  add (token: Token, metadata?: Token.Metadata): void;
  /**
   * Updates the {@link Token} value in storage for a given {@link id | Token.id}.
   * Used by operations like {@link Credential.refresh}
   */
  replace (id: string, token: Token): void;
  /**
   * Removes the {@link Token} value for a given {@link id | Token.id} from storage
   * 
   * @remarks
   * **NOTE:** This does *not* {@link Credential.revoke | revoke} tokens. They are only removed from storage!
   */
  remove (id: string): void;
  /**
   * Retrieves a {@link Token} from storage
   * 
   * @remarks
   * This may prompt user for biometrics in certain mobile environments
   */
  get (id: string): Token | null;
  /**
   * Retieves {@link Token.Metadata} for a given {@link Token.id | id}
   * 
   * @remarks
   * {@link Token.Metadata} will be written to less-protected location and therefore will not prompt biometrics
   */
  getMetadata (id: string): Token.Metadata | null;
  /**
   * Writes {@link Token.Metadata} for a given {@link Token} to storage
   */
  setMetadata (metadata: Token.Metadata): void;
  /**
   * Clears all {@link Token}s from storage
   * 
   * @remarks
   * **NOTE:** This does *not* {@link Credential.revoke | revoke} tokens. They are only removed from storage!
   */
  clear (): void;
}

class TokenStorageEventEmitter extends EventEmitter {
  tokenAdded (storage: TokenStorage, id: string, token: Token) {
    const event: TokenStorageDelegate.TokenAdded = { storage, id, token };
    this.emit('token_added', event);
  }

  tokenRemoved (storage: TokenStorage, id: string) {
    const event: TokenStorageDelegate.TokenRemoved = { storage, id };
    this.emit('token_removed', event);
  }

  tokenReplaced (storage: TokenStorage, id: string, token: Token) {
    const event: TokenStorageDelegate.TokenReplaced = { storage, id, token };
    this.emit('token_replaced', event);
  }

  defaultChanged (storage: TokenStorage, id: string | null) {
    const event: TokenStorageDelegate.DefaultChanged = { storage, id };
    this.emit('default_changed', event);
  }
}

/** @internal */
export namespace TokenStorageDelegate {
  export type Events = 'token_added' | 'token_removed' | 'token_replaced' | 'default_changed';

  type TokenStorageDelegateEvent = {
    storage:  TokenStorage;
    id: string;
  }

  export type TokenAdded = TokenStorageDelegateEvent & {
    token: Token;
  };

  export type TokenRemoved = TokenStorageDelegateEvent;

  export type TokenReplaced = TokenStorageDelegateEvent & {
    token: Token; 
  };

  export type DefaultChanged = {
    storage:  TokenStorage;
    id: string | null;
  };
}

/**
 * @internal
 * Default implementation of TokenStorage backend by `localStorage`
 */
export class BrowserTokenStorage implements TokenStorage {
  #defaultTokenId: string | null;
  #defaultCredentialKey: string = 'okta-default';
  tokenPrefix: string = 'okta-token';

  readonly emitter = new TokenStorageEventEmitter();

  constructor () {
    this.#defaultTokenId = localStorage.getItem(this.#defaultCredentialKey) ?? null;
  }

  get defaultTokenId (): string | null {
    return this.#defaultTokenId;
  }

  private idToStoreKey (id: string): string {
    return `${this.tokenPrefix}:${id}`;
  }

  setDefaultTokenId (id: string | null): void {
    if (id === this.defaultTokenId) {
      return;
    }

    this.#defaultTokenId = id;
    this.saveDefault();
    this.emitter.defaultChanged(this, id);
  }

  private saveDefault(): void {
    const id = this.defaultTokenId;
    if (id) {
      localStorage.setItem(this.#defaultCredentialKey, id);
    }
    else {
      localStorage.removeItem(this.#defaultCredentialKey);
    }
  }

  allIDs (): string[] {
    if (localStorage.length > 0) {
      const keys: string[] = [];
      for (let i=0; i<localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`${this.tokenPrefix}:`)) {
          // strips storage prefix from
          keys.push(key.slice(this.tokenPrefix.length + 1));
        }
      }
      return keys;
    }
    return [];
  }

  add (token: Token, metadata?: Token.Metadata): void {
    metadata ??= Token.Metadata(token);
    if (token.id !== metadata.id) {
      throw new CredentialError('metadataConsistency');
    }

    const mdata: Record<string, any> = metadata;
    // storing idToken claims in localStorage would redundant
    delete mdata.payload;

    const key = this.idToStoreKey(token.id);

    if (localStorage.getItem(key)) {
      // TODO: make TokenError
      throw new CredentialError('duplicateTokenAdded');
    }

    const changedDefault = this.allIDs().length === 0;

    const data = { token: token.toJSON(), metadata: mdata };
    localStorage.setItem(key, JSON.stringify(data));

    this.emitter.tokenAdded(this, token.id, token);

    if (changedDefault) {
      this.setDefaultTokenId(token.id);
    }
  }

  replace (id: string, token: Token): void {
    const oldResult = localStorage.getItem(this.idToStoreKey(id));
    if (!oldResult) {
      // TODO: TokenError?
      throw new CredentialError('cannotReplaceToken');
    }

    const key = this.idToStoreKey(token.id);
    // set token id?

    const { metadata } = JSON.parse(oldResult);
    const data = { token: token.toJSON(), metadata };
    localStorage.setItem(key, JSON.stringify(data));
    this.emitter.tokenReplaced(this, id, token);
  }

  remove (id: string): void {
    localStorage.removeItem(this.idToStoreKey(id));
    this.emitter.tokenRemoved(this, id);
    if (this.defaultTokenId === id) {
      this.setDefaultTokenId(null);
    }
  }

  private readFromStorage (id: string): Record<string, any> | null {
    const raw = localStorage.getItem(this.idToStoreKey(id));
    if (!raw) {
      return null;
    }
    return JSON.parse(raw);
  }

  get (id: string): Token | null {
    const stored = this.readFromStorage(id);
    if (!stored) {
      return null;
    }
    const { token } = stored;
    return new Token({id, ...token});
  }

  getMetadata (id: string): Token.Metadata | null {
    const stored = this.readFromStorage(id);
    if (!stored) {
      return null;
    }
    const { metadata } = stored;
    return metadata;
  }

  setMetadata (metadata: Token.Metadata): void {
    const oldResult = localStorage.getItem(this.idToStoreKey(metadata.id));
    if (!oldResult) {
      // TODO: TokenError?
      throw new CredentialError('metadataConsistency');
    }

    const key = `${this.tokenPrefix}:${metadata.id}`;
    // set token id?

    const { token } = JSON.parse(oldResult);
    const data = { token, metadata };
    localStorage.setItem(key, JSON.stringify(data));
  }

  clear (): void {
    // NOTE: do not use `storage.clear` as that will remove items from storage not written by this library
    this.allIDs().forEach(id => {
      localStorage.removeItem(this.idToStoreKey(id));
    });
  }
}
