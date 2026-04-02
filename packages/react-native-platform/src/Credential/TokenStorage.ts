/**
 * @packageDocumentation
 * @internal
 */

import {
  Token,
  type TokenStorage,
  type TokenStorageEvents,
  EventEmitter,
  CredentialError
} from '@okta/auth-foundation/core';
import NativeTokenStorage from '../specs/NativeTokenStorageBridge.ts';


/**
 * React Native implementation of TokenStorage
 * 
 * Uses native bridge to store:
 * - Tokens in secure storage (iOS Keychain / Android EncryptedSharedPreferences)
 * - Metadata in regular storage (iOS UserDefaults / Android SharedPreferences)
 * 
 * @internal
 */
export class ReactNativeTokenStorage implements TokenStorage {
  private static version = 1;

  readonly emitter: EventEmitter<TokenStorageEvents> = new EventEmitter();

  #defaultId: string | null | undefined = undefined;

  get defaultTokenId (): string | null | undefined {
    return this.#defaultId;
  }

  set defaultTokenId (id: string | null) {
    this.#defaultId = id;
  }

  async loadDefaultTokenId (): Promise<string | null> {
    if (this.defaultTokenId === undefined) {
      const id = await NativeTokenStorage.getDefaultTokenId();
      this.defaultTokenId = id;   // caches the value returned from storage
      return id;
    }

    return this.defaultTokenId;
  }

  async setDefaultTokenId (id: string | null): Promise<void> {
    if (id === this.defaultTokenId) {
      return;
    }

    await NativeTokenStorage.setDefaultTokenId(id);
    this.defaultTokenId = id;
    this.emitter.emit('default_changed', { storage: this, id });
  }

  async allIDs (): Promise<string[]> {
    return await NativeTokenStorage.getAllTokenIds();
  }

  async add (token: Token, metadata?: Token.Metadata): Promise<void> {
    metadata ??= Token.Metadata(token);
    if (token.id !== metadata.id) {
      throw new CredentialError('metadataConsistency');
    }
    
    // Check for duplicates
    const existingToken = await this.get(token.id);
    if (existingToken) {
      // TODO: make TokenError
      throw new CredentialError('duplicateTokenAdded');
    }

    const changedDefault = (await this.allIDs()).length === 0;
    await this.writeTokenToStorage(token);
    await this.writeMetadataToStorage(metadata);

    this.emitter.emit('token_added', { storage: this, id: token.id, token });

    if (changedDefault) {
      await this.setDefaultTokenId(token.id);
    }
  }

  async replace (id: string, token: Token): Promise<void> {
    if (id !== token.id) {
      throw new CredentialError(`Token id mismatch: ${id} !== ${token.id}`);
    }

    const metadata = await this.getMetadata(id);
    if (token.id !== metadata?.id) {
      throw new CredentialError('metadataConsistency');
    }

    await this.writeTokenToStorage(token);

    this.emitter.emit('token_replaced', { storage: this, id, token });
  }

  async remove (id: string): Promise<void> {
    // `Bridge.removeToken` will also delete the metadata from separate storage location
    await NativeTokenStorage.removeToken(id);

    this.emitter.emit('token_removed', { storage: this, id });

    if (this.defaultTokenId === id) {
      await this.setDefaultTokenId(null);
    }
  }

  async get (id: string): Promise<Token | null> {
    const raw = await NativeTokenStorage.getToken(id);

    if (!raw) {
      return null;
    }

    let json;
    try {
      json = JSON.parse(raw);
    } catch (error) {
      return await this.handleReadError(error, id);
    }

    const { token, v } = json;
    
    if (v !== ReactNativeTokenStorage.version) {
      console.warn(`Token storage version mismatch: ${v} !== ${ReactNativeTokenStorage.version}`);
    }

    // Restore context from metadata
    const metadata = await this.getMetadata(id);
    if (metadata) {
      token.context = Token.extractContext(metadata);
    }

    return new Token({ id, ...token });
  }

  async getMetadata (id: string): Promise<Token.Metadata | null> {
    const raw = await NativeTokenStorage.getMetadata(id);
    if (!raw) {
      return null;
    }

    let json;
    try {
      json = JSON.parse(raw);
    } catch (error) {
      return await this.handleReadError(error, id);
    }

    const { metadata, v } = json;
    
    if (v !== ReactNativeTokenStorage.version) {
      console.warn(`Token storage version mismatch: ${v} !== ${ReactNativeTokenStorage.version}`);
    }

    return metadata;
  }

  async setMetadata (metadata: Token.Metadata): Promise<void> {
    await this.writeMetadataToStorage(metadata);
    this.emitter.emit('metadata_updated', { storage: this, id: metadata.id, metadata });
  }

  async clear (): Promise<void> {
    // NOTE: Bridge.clearTokens() also deletes `defaultTokenId`, no reason to make multiple bridge requests
    await NativeTokenStorage.clearTokens();
    
    this.defaultTokenId = null;
    this.emitter.emit('default_changed', { storage: this, id: null });
  }

  // Helper methods

  protected async writeTokenToStorage (token: Token): Promise<void> {
    const rawToken = token.toJSON();
    delete rawToken.context; // Stored in metadata

    const data = {
      token: rawToken,
      v: ReactNativeTokenStorage.version
    };

    await NativeTokenStorage.saveToken(token.id, JSON.stringify(data));
  }

  protected async writeMetadataToStorage (metadata: Token.Metadata): Promise<void> {
    const data = {
      metadata,
      v: ReactNativeTokenStorage.version
    };

    await NativeTokenStorage.saveMetadata(metadata.id, JSON.stringify(data));
  }

  protected async handleReadError (error: unknown, id: string): Promise<null> {
    console.error(`Error reading token ${id}:`, error);
    await NativeTokenStorage.removeToken(id);
    return null;
  }
}