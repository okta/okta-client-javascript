/**
 * @module
 * @mergeModuleWith Credential
 */

import { Token } from '../Token.ts';
import { EventEmitter } from '../utils/EventEmitter.ts';
import { CredentialError } from '../errors/index.ts';


type TokenStorageEvent = { storage: TokenStorage, id: string };
export type TokenStorageEvents = {
  'token_added': TokenStorageEvent & { token: Token };
  'token_removed': TokenStorageEvent;
  'token_replaced': TokenStorageEvent & { token: Token };
  'default_changed': Omit<TokenStorageEvent, 'id'> & { id: string | null };
  'metadata_updated': TokenStorageEvent & { metadata: Token.Metadata };
};

/**
 * @public @interface
 * 
 * Defines interface for token storage. {@link Token.Token | Token} and {@link Token.Token.Metadata:TYPE | Token.Metadata} are treated as independent entities,
 * which enables them to be stored in different locations. This may be more relevant in mobile environments, where {@link Token.Token | Token} data can be
 * written to a secure location (which requires biometrics to access) and {@link Token.Token.Metadata:TYPE | Token.Metadata}, containing only non-sensitive info
 * can be stored in a more accessible location and used to query which tokens are available (without prompting biometrics)
 * 
 * @remarks
 * Default implementation provided based on {@link https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage | localStorage}
 */
export interface TokenStorage {
  readonly emitter: EventEmitter<TokenStorageEvents>;
  /**
   * In memory cached value of the {@link Credential.getDefault | default Credential}'s id
   */
  readonly defaultTokenId: string | null;
  /**
   * Updates the stored {@link Credential.getDefault | default Credential} id
   */
  setDefaultTokenId (id: string | null): Promise<void>;
  /**
   * Returns all token {@link Token.Token.id | ids} in storage
   */
  allIDs (): Promise<string[]>;
  /**
   * Writes a {@link Token.Token | Token} to storage
   * 
   * @param token - raw JSON representation of {@link Token.Token | Token}
   * @param metadata - non-sensitive data regarding the stored {@link Token.Token | Token} which will be used in storage queries
   */
  add (token: Token, metadata?: Token.Metadata): Promise<void>;
  /**
   * Updates the {@link Token.Token | Token} value in storage for a given {@link Token.Token.id | id}.
   * Used by operations like {@link Credential.refresh}
   */
  replace (id: string, token: Token): Promise<void>;
  /**
   * Removes the {@link Token.Token | Token} value for a given {@link Token.Token.id | id} from storage
   * 
   * @remarks
   * **NOTE:** This does *not* {@link Credential.revoke | revoke} tokens. They are only removed from storage!
   */
  remove (id: string): Promise<void>;
  /**
   * Retrieves a {@link Token.Token | Token} from storage
   * 
   * @remarks
   * This may prompt user for biometrics in certain mobile environments
   */
  get (id: string): Promise<Token | null>;
  /**
   * Retieves {@link Token.Token.Metadata:TYPE | Token.Metadata} for a given {@link Token.Token.id | id}
   * 
   * @remarks
   * {@link Token.Token.Metadata:TYPE | Token.Metadata} will be written to less-protected location and therefore will not prompt biometrics
   */
  getMetadata (id: string): Promise<Token.Metadata | null>;
  /**
   * Writes {@link Token.Token.Metadata:TYPE | Token.Metadata} for a given {@link Token.Token | Token} to storage
   */
  setMetadata (metadata: Token.Metadata): Promise<void>;
  /**
   * Clears all {@link Token.Token | Token} instances from storage
   * 
   * @remarks
   * **NOTE:** This does *not* {@link Credential.revoke | revoke} tokens. They are only removed from storage!
   */
  clear (): Promise<void>;
}

/**
 * A simple Map-based TokenStorage implementation. Not necessarily intended for production use!
 * 
 * @internal
 */
export class DefaultTokenStorage implements TokenStorage {
  readonly emitter: EventEmitter<TokenStorageEvents> = new EventEmitter();

  #store: Map<string, { token: Token, metadata: Token.Metadata }> = new Map();
  #defaultId: string | null = null;

  get defaultTokenId (): string | null {
    return this.#defaultId;
  }

  async setDefaultTokenId (id: string | null): Promise<void> {
    if (id === this.defaultTokenId) {
      return;
    }

    this.saveDefault(id);
    this.emitter.emit('default_changed', { storage: this, id });
  }

  protected saveDefault (id: string | null): void {
    this.#defaultId = id;
  }

  async allIDs (): Promise<string[]> {
    return [...this.#store.keys()];
  }

  async add (token: Token, metadata?: Token.Metadata | undefined): Promise<void> {
    metadata ??= Token.Metadata(token);
    if (token.id !== metadata.id) {
      throw new CredentialError('metadataConsistency');
    }

    if (this.#store.has(token.id)) {
      // TODO: make TokenError
      throw new CredentialError('duplicateTokenAdded');
    }

    const mdata: Token.Metadata = { ...metadata };

    const changedDefault = (await this.allIDs()).length === 0;
    this.#store.set(token.id, { token, metadata: mdata });
    this.emitter.emit('token_added', { storage: this, id: token.id, token });

    if (changedDefault) {
      await this.setDefaultTokenId(token.id);
    }
  }

  async replace (id: string, token: Token): Promise<void> {
    const oldResult = this.#store.get(id);
    if (!oldResult) {
      // TODO: TokenError?
      throw new CredentialError('cannotReplaceToken');
    }

    const { metadata } = oldResult;
    this.#store.set(metadata.id, { token, metadata });
    this.emitter.emit('token_replaced', { storage: this, id: token.id, token });
  }

  async remove (id: string): Promise<void> {
    this.#store.delete(id);
    this.emitter.emit('token_removed', { storage: this, id });
    if (this.defaultTokenId === id) {
      await this.setDefaultTokenId(null);
    }
  }

  async get (id: string): Promise<Token | null> {
    if (!this.#store.has(id)) {
      return null;
    }

    const { token } = this.#store.get(id)!;
    return token;
  }

  async getMetadata (id: string): Promise<Token.Metadata | null> {
    if (!this.#store.has(id)) {
      return null;
    }

    const { metadata } = this.#store.get(id)!;
    return metadata;
  }

  async setMetadata (metadata: Token.Metadata): Promise<void> {
    const oldResult = this.#store.get(metadata.id);
    if (!oldResult) {
      // TODO: TokenError?
      throw new CredentialError('metadataConsistency');
    }
    const token = oldResult.token;
    this.#store.set(metadata.id, { token, metadata });
    this.emitter.emit('metadata_updated', { storage: this, id: metadata.id, metadata });
  }

  async clear (): Promise<void> {
    this.#store.clear();
    await this.setDefaultTokenId(null);
  }
}
