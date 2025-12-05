/**
 * @packageDocumentation
 * @internal
 */

import {
  JsonRecord,
  TokenStorage,
  TokenStorageEvents,
  CredentialError,
  EventEmitter
} from '@okta/auth-foundation';
import { buf, b64u } from '@okta/auth-foundation/internal';
import { Token } from '../platform/index.ts';
import { IndexedDBStore } from '../utils/IndexedDBStore.ts';


/**
 * Default implementation of TokenStorage backend by `localStorage`
 * @internal
 */
export class BrowserTokenStorage implements TokenStorage {
  // increment this value if breaking changes to the JSON structure of a Token is required
  // allows the opportunity for transformers to be implemented
  private static version = 3;

  #defaultCredentialKey: string = 'okta-default';
  tokenPrefix: string = 'oauth-token';

  // encryption
  encryptionKeyStore = new IndexedDBStore<CryptoKey>('StorageKeys');
  encryptionKeyName = 'EncryptionKey';

  // configurations
  public includeClaims: boolean = true;     // when true, idToken claims are stored in token metadata to use token selection
  public encryptAtRest: boolean = true;     // when true, tokens are encrypted before written to storage (and decrypted when retrieved)
  // TODO: [OKTA-977044] remove
  public supportLegacyStructure: boolean = false;

  readonly emitter: EventEmitter<TokenStorageEvents> = new EventEmitter();

  get defaultCredentialKey (): string {
    return this.#defaultCredentialKey;
  }

  set defaultCredentialKey (key: string) {
    this.#defaultCredentialKey = key;
    this.saveDefault(null);   // if default key is updated, clear current default
  }

  // No point in caching value when we can just read storage each time
  get defaultTokenId (): string | null {
    return localStorage.getItem(this.defaultCredentialKey) ?? null;
  }

  protected idToStoreKey (id: string): string {
    return `${this.tokenPrefix}:${id}`;
  }

  // TODO: [OKTA-977044] remove
  protected legacyStoreKey (id: string): string {
    return `${this.tokenPrefix}:v2:${id}`;
  }

  async setDefaultTokenId (id: string | null): Promise<void> {
    if (id === this.defaultTokenId) {
      return;
    }

    this.saveDefault(id);
    this.emitter.emit('default_changed', { storage: this, id });
  }

  private saveDefault (id: string | null): void {
    if (id) {
      localStorage.setItem(this.defaultCredentialKey, id);
    }
    else {
      localStorage.removeItem(this.defaultCredentialKey);
    }
  }

  async allIDs (): Promise<string[]> {
    if (localStorage.length > 0) {
      const keys: string[] = [];
      for (let i=0; i<localStorage.length; i++) {
        const key = localStorage.key(i);

        // TODO: [OKTA-977044] remove legacy migration logic
        if (this.supportLegacyStructure && key && key.startsWith(`${this.tokenPrefix}:v2:`)) {
          const id = key.slice(this.tokenPrefix.length + 4);
          keys.push(id);
        }

        // TODO: [OKTA-977044] remove 'v2' check
        // if (key && key.startsWith(`${this.tokenPrefix}:`)) {
        if (key && key.startsWith(`${this.tokenPrefix}:`) && !key.startsWith(`${this.tokenPrefix}:v2:`)) {
          // strips storage prefix from
          keys.push(key.slice(this.tokenPrefix.length + 1));
        }
      }

      return keys;
    }
    return [];
  }

  async add (token: Token, metadata?: Token.Metadata): Promise<void> {
    metadata ??= Token.Metadata(token);
    if (token.id !== metadata.id) {
      throw new CredentialError('metadataConsistency');
    }

    const mdata: Record<string, any> = metadata;
    // storing idToken claims in localStorage would redundant
    if (!this.includeClaims) {
      delete mdata.claims;
    }

    const key = this.idToStoreKey(token.id);

    if (localStorage.getItem(key)) {
      // TODO: make TokenError
      throw new CredentialError('duplicateTokenAdded');
    }

    const changedDefault = (await this.allIDs()).length === 0;
    await this.writeToStorage(token, mdata);

    this.emitter.emit('token_added', { storage: this, id: token.id, token });

    if (changedDefault) {
      await this.setDefaultTokenId(token.id);
    }
  }

  async replace (id: string, token: Token): Promise<void> {
    // TODO: [OKTA-977044] remove
    const oldResult =
      localStorage.getItem(this.legacyStoreKey(id)) ??
      localStorage.getItem(this.idToStoreKey(id));
    //const oldResult = localStorage.getItem(this.idToStoreKey(id));
    if (!oldResult) {
      // TODO: TokenError?
      throw new CredentialError('cannotReplaceToken');
    }

    const { metadata } = JSON.parse(oldResult);
    if (token.id !== metadata.id) {
      throw new CredentialError('metadataConsistency');
    }

    await this.writeToStorage(token, metadata);
    this.emitter.emit('token_replaced', { storage: this, id: token.id, token });
  }

  async remove (id: string): Promise<void> {
    // TODO: [OKTA-977044] remove if/else
    if (this.supportLegacyStructure) {
      localStorage.removeItem(this.legacyStoreKey(id));
    }
    else {
      localStorage.removeItem(this.idToStoreKey(id));
    }

    // TODO: [OKTA-977044] uncomment
    // localStorage.removeItem(this.idToStoreKey(id));
    this.emitter.emit('token_removed', { storage: this, id });
    if (this.defaultTokenId === id) {
      this.setDefaultTokenId(null);
    }

    if (this.encryptAtRest) {
      await this.removeEncryptionKeyIfEmpty();
    }
  }

  async get (id: string): Promise<Token | null> {
    const stored = await this.readFromStorage(id);
    if (!stored) {
      return null;
    }

    const { token, metadata } = stored;
    // extract Token.Context values from Metadata (which includes additional key/values)
    const context = Token.extractContext(metadata);
    // TODO: confirm client info, should be added to storage
    return new Token({ id, ...token, context });
  }

  async getMetadata (id: string): Promise<Token.Metadata | null> {
    const stored = await this.readFromStorage(id);
    if (!stored) {
      return null;
    }
    const { metadata } = stored;
    return metadata;
  }

  async setMetadata (metadata: Token.Metadata): Promise<void> {
    // TODO: [OKTA-977044] remove
    let key = this.legacyStoreKey(metadata.id);
    if (!localStorage.getItem(key)) {
      key = this.idToStoreKey(metadata.id);
    }
    const oldResult = localStorage.getItem(key);

    // TODO: [OKTA-977044] uncomment
    // const oldResult = localStorage.getItem(this.idToStoreKey(metadata.id));
    if (!oldResult) {
      // TODO: TokenError?
      throw new CredentialError('metadataConsistency');
    }

    // TODO: [OKTA-977044] uncomment
    // const key = this.idToStoreKey(metadata.id);

    const { token } = JSON.parse(oldResult);
    const data = { token, metadata };
    localStorage.setItem(key, JSON.stringify(data));
    this.emitter.emit('metadata_updated', { storage: this, id: metadata.id, metadata });
  }

  async clear (): Promise<void> {
    // NOTE: do not use `storage.clear` as that will remove items from storage not written by this library
    (await this.allIDs()).forEach(id => {
      // TODO: [OKTA-977044] remove
      if (this.supportLegacyStructure) {
        localStorage.removeItem(this.legacyStoreKey(id));
      }
      localStorage.removeItem(this.idToStoreKey(id));
    });
    await this.setDefaultTokenId(null);

    // TODO: [OKTA-977044] remove
    if (this.encryptAtRest && !this.supportLegacyStructure) {
    // if (this.encryptAtRest) {
      // if no tokens exist in storage, remove the encryption key therefore
      // it will be rotated once a new token is added
      await this.encryptionKeyStore.remove(this.encryptionKeyName);
    }
  }

  protected async writeToStorage (token: Token, metadata: Record<string, any>): Promise<void> {
    // TODO: [OKTA-977044] remove in future, legacy format won't be supported long term
    if (this.supportLegacyStructure) {
      return this.writeLegacy(token, metadata);
    }

    const rawToken = token.toJSON();
    // storing context is redundant, delete it from stored object (and re-populate via metadata when read)
    delete rawToken.context;
    const data: { token: JsonRecord | string, metadata: JsonRecord, v: number } = {
      token: rawToken,
      metadata,
      v: BrowserTokenStorage.version
    };

    if (this.encryptAtRest) {
      const encryptedToken = await this.encrypt(JSON.stringify(rawToken), token.id);
      data.token = b64u(encryptedToken);
    }

    const key = this.idToStoreKey(token.id);
    localStorage.setItem(key, JSON.stringify(data));
  }

  protected async readFromStorage (id: string): Promise<Record<string, any> | null> {
    try {
      // TODO: [OKTA-977044] remove in future, legacy format won't be supported long term
      const legacy = localStorage.getItem(this.legacyStoreKey(id));
      if (legacy) {
        // maybe dont migrate?
        return this.convertFromLegacy(id);
      }

      const raw = localStorage.getItem(this.idToStoreKey(id));
      if (!raw) {
        return null;
      }
      const json = JSON.parse(raw);

      // NOTE: add json structure migrations here in the future (above v3)
      // if (json.v === 3) { return migration() }

      // .token will be a string when encrypted, object when stored unecrypted
      if (typeof json.token === 'string') {
        try {
          const { token: encryptedToken, metadata } = json;
          const decrypted = await this.decrypt(encryptedToken, id);
          const token = JSON.parse(buf(decrypted));

          return { token, metadata };
        }
        catch (err) {
          return await this.handleDecryptionError(err as Error, id);
        }
      }

      // else - avoids issues parsing when `encryptAtRest` is toggled
      return json;
    }
    catch (err) {
      return await this.handleReadError(err, id);
    }
  }

  // TODO: [OKTA-977044] remove
  protected writeLegacy (token: Token, metadata: Record<string, any>) {
    const key = this.legacyStoreKey(token.id);
    const data = { token: token.toJSON(), metadata };
    localStorage.setItem(key, JSON.stringify(data));
  }

  // TODO: [OKTA-977044] remove
  protected convertFromLegacy (id: string) {
    const key = this.legacyStoreKey(id);
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        const { token, metadata } = JSON.parse(raw);
        const { context, ...t } = token;
        return { token: t, metadata: { ...context, ...metadata }};
      }
      catch (err) {
        // if payload is malformed, just remove
        localStorage.removeItem(key);
        return null;
      }
    }
    return null;  // will never be reached
  }

  /**
   * Handles errors thrown when reading a token from storage
   */
  protected async handleReadError (error: unknown, id: string) {
    // remove token if json structure is malformed
    localStorage.removeItem(this.idToStoreKey(id));
    return null;
  }

  /**
   * Handles errors thrown when decrypting a stored token
   */
  protected async handleDecryptionError (error: Error, id: string) {
    // if token cannot be decrypted, remove it from storage
    localStorage.removeItem(this.idToStoreKey(id));
    await this.removeEncryptionKeyIfEmpty();
    return null;
  }

  protected async getEncryptionKey (): Promise<CryptoKey> {
    const encryptionKey = await this.encryptionKeyStore.get(this.encryptionKeyName);
    if (!encryptionKey) {
      const newKey = await this.generateEncryptionKey();
      await this.encryptionKeyStore.add(this.encryptionKeyName, newKey);
      return newKey;
    }

    return encryptionKey;
  }

  protected async generateEncryptionKey (): Promise<CryptoKey> {
    const encryptionKey = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      // The "false" here makes it non-exportable
      // https://caniuse.com/mdn-api_subtlecrypto_generatekey
      false,
      ['encrypt', 'decrypt']
    );

    return encryptionKey;
  }

  protected async removeEncryptionKeyIfEmpty () {
      // TODO: [OKTA-977044] remove
    if (this.supportLegacyStructure) { return; }    // in legacy mode, do not interact with indexedDB and

    if ((await this.allIDs()).length === 0) {
      // if no tokens exist in storage, remove the encryption key therefore
      // it will be rotated once a new token is added
      await this.encryptionKeyStore.remove(this.encryptionKeyName);
    }
  }

  protected async encrypt (plainText: string, iv: string) {
    const encryptionKey = await this.getEncryptionKey();
    return await crypto.subtle.encrypt({ name: 'AES-GCM', iv: buf(iv) }, encryptionKey, buf(plainText));
  }

  protected async decrypt (encryptedText: string, iv: string) {
    const encryptionKey = await this.getEncryptionKey();
    return await crypto.subtle.decrypt({ name: 'AES-GCM', iv: buf(iv) }, encryptionKey, b64u(encryptedText));
  }
}
