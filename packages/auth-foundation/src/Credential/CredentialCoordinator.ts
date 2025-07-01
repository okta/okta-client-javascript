/**
 * @module
 * @mergeModuleWith Credential
 */

import type { OAuth2Client } from '../oauth2/client.ts';
import type { Credential } from './Credential.ts';
import { Token } from '../Token.ts';
import { EventEmitter } from '../utils/EventEmitter.ts';
import {
  DefaultCredentialDataSource,
  type CredentialDataSource,
  type CredentialDataSourceEvents
} from './CredentialDataSource.ts';
import { DefaultTokenStorage, TokenStorage, TokenStorageEvents } from './TokenStorage.ts';


// TODO: for development
// function log (...args: any[]) {
//   console.log(...args);
// }
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function log (...args: any[]) {}


export type CredentialCoordinatorEvents = {
  'credential_expired': { credential: Credential };
  'credential_refreshed': { credential: Credential };
  'cleared': void;
} 
& Pick<TokenStorageEvents, 'default_changed' | 'metadata_updated' | 'token_replaced'>
& CredentialDataSourceEvents;

/**
 * @public @interface
 * 
 * Holds the implementation of most {@link Credential} methods. Bridges the
 * {@link CredentialDataSource} and {@link TokenStorage} layers together
 * 
 * @remarks
 * Default implementation provided
 */
export interface CredentialCoordinator {
  emitter: EventEmitter<CredentialCoordinatorEvents>;
  /**
   * Represents {@link Credential.getDefault}, backed by {@link CredentialCoordinator.tokenStorage | TokenStorage}
   */
  getDefault (): Promise<Credential | null>;
  setDefault (cred: Credential | null): Promise<void>;
  get tokenStorage (): TokenStorage;
  /**
   * Writes the provided {@link Token.Token | Token} (and {@link Token.Token.Metadata:TYPE | Token.Metadata}) to storage and creates a {@link Credential}
   * instance to represent the {@link Token.Token | Token} via the {@link CredentialDataSource}
   * 
   * @param token - the {@link Token.Token | Token} to store
   * @param tags - an array of developer-provided tags to associate with a {@link Token.Token | Token}.
   * Used by {@link Credential.find} queries
   */
  store (token: Token, tags: string[]): Promise<Credential>;
  /**
   * Retrieves a {@link Credential} for the provided `id` from storage
   */
  with (id: string): Promise<Credential | null>;
  /**
   * Uses stored {@link Token.Token.Metadata:TYPE | Token.Metadata} to match stored {@link Token.Token | Tokens} by certain criteria
   */
  find (matcher: (meta: Token.Metadata) => boolean): Promise<Credential[]>;
  /**
   * Removes the provided {@link Credential} from storage and {@link CredentialDataSource}
   * 
   * @remarks
   * **NOTE:** This does *not* {@link Credential.revoke | revoke} tokens!
   */
  remove (cred: Credential): Promise<void>;
  /**
   * Clears both {@link TokenStorage} and {@link CredentialDataSource}
   * 
   * @remarks
   * **NOTE:** This does *not* {@link Credential.revoke | revoke} tokens!
   */
  clear (): Promise<void>;
  /**
   * Returns all token {@link Token.Token.id | ids} in storage
   */
  allIDs (): Promise<string[]>;
  /**
   * Returns the number of recorded {@link Credential} instances in the {@link CredentialDataSource}
   */
  readonly size: number;
}

/** @internal */
export class CredentialCoordinatorImpl implements CredentialCoordinator {
  readonly emitter: EventEmitter<CredentialCoordinatorEvents> = new EventEmitter();
  protected readonly expiryTimeouts: { [key: string]: ReturnType<typeof setTimeout> } = {};

  // see `getDefault` / `setDefault`
  // mimic "lazy" loading value: Cred | null are the "real types"
  // undefined indicates the value hasn't been resolved yet (loaded from storage)
  protected _default: Credential | null | undefined = undefined;

  // @ts-expect-error - property is set in constructor via `this.credentialDataSource` (which is a setter)
  protected _credentialDataSource: CredentialDataSource;
  // @ts-expect-error - property is set in constructor via `this.tokenStorage` (which is a setter)
  protected _tokenStorage: TokenStorage;

  constructor (CredentialConstructor: new (token: Token, client: OAuth2Client) => Credential) {
    this.tokenStorage = new DefaultTokenStorage();
    this.credentialDataSource = new DefaultCredentialDataSource(CredentialConstructor);
  }

  public get credentialDataSource (): CredentialDataSource {
    return this._credentialDataSource;
  }

  public set credentialDataSource (dataSource: CredentialDataSource) {
    const events: (keyof CredentialDataSourceEvents)[] = ['credential_added', 'credential_removed'];
    if (this.credentialDataSource) {
      events.forEach(evt => this.credentialDataSource.emitter.off(evt));
    }

    this._credentialDataSource = dataSource;

    this.credentialDataSource.emitter.on('credential_added', ({ credential }) => {
      if (!credential.token.isExpired) {
        this.addExpireEventTimeout(credential);
      }
      credential.oauth2.emitter.on('token_did_refresh', async ({ token }) => {
        if (!token || credential.id !== token.id) { return; }
        try {
          await this.tokenStorage.replace(token.id, token);
          this.clearExpireEventTimeout(credential.id);
          this.addExpireEventTimeout(credential);
          this.emitter.emit('credential_refreshed', { credential });
        }
        catch (err) {
          // TODO: emit refresh error?
          console.error('Failed to replace token after refresh');
        }
      });
    });

    this.credentialDataSource.emitter.on('credential_removed', ({ id }) => {
      this.clearExpireEventTimeout(id);
    });

    this.emitter.relay(this.credentialDataSource.emitter, ['credential_added', 'credential_removed']);
  }

  public get tokenStorage (): TokenStorage {
    return this._tokenStorage;
  }

  public set tokenStorage (tokenStorage: TokenStorage) {
    this._tokenStorage = tokenStorage;
    const events: (keyof TokenStorageEvents)[] = ['default_changed', 'token_replaced'];

    events.forEach(evt => this.tokenStorage.emitter.off(evt));

    this.emitter.relay(this.tokenStorage.emitter, ['default_changed', 'token_replaced']);
    this.tokenStorage.emitter.on('default_changed', () => {
      this._default = undefined;      // clears cached value, which will trigger storage "reload" once accessed again
    });
  }

  protected clearExpireEventTimeout(id: string) {
    clearTimeout(this.expiryTimeouts[id]);
    delete this.expiryTimeouts[id];
  }

  protected addExpireEventTimeout(credential: Credential) {
    this.clearExpireEventTimeout(credential.id);
    this.expiryTimeouts[credential.id] = setTimeout(() => {
      this.emitter.emit('credential_expired', { credential });
    }, credential.token.expiresIn * 1000);
  }

  public async getDefault (): Promise<Credential | null> {
    if (this._default === undefined) {
      this._default = await this.loadDefaultCredential();
    }
    return this._default;
  }

  public async setDefault (cred: Credential | null): Promise<void> {
    await this.tokenStorage.setDefaultTokenId(cred?.id ?? null);
    this._default = cred;
  }

  public async store (token: Token, tags: string[] = []): Promise<Credential> {
    const metadata = Token.Metadata(token, tags);
    await this.tokenStorage.add(token, metadata);
    const cred = this.credentialDataSource.credentialFor(token, metadata);
    return cred;
  }

  public async with (id: string): Promise<Credential | null> {
    const [token, metadata] = await Promise.all([
      this.tokenStorage.get(id),
      this.tokenStorage.getMetadata(id)
    ]);
    if (token) {
      const cred = this.credentialDataSource.credentialFor(token, metadata ?? undefined);
      return cred;
    }

    return null;
  }

  public async find (matcher: (meta: Token.Metadata) => boolean): Promise< Credential[]> {
    const matches: Credential[] = [];
    for (const id of (await this.allIDs())) {
      const metadata = await this.tokenStorage.getMetadata(id);
      if (metadata && matcher(metadata)) {
        const cred = await this.with(metadata.id);
        // if metadata exist, cred should always exist. Simply a sanity check
        if (cred) {
          matches.push(cred);
        }
      }
    }

    return matches;
  }

  public async remove (cred: Credential): Promise<void> {
    await this.tokenStorage.remove(cred.id);
    this.credentialDataSource.remove(cred);
  }

  public async clear (localOnly = false): Promise<void> {
    Object.keys(this.expiryTimeouts).forEach(t => this.clearExpireEventTimeout(t));
    this.credentialDataSource.clear();
    if (!localOnly) {
      await this.tokenStorage.clear();
      this.emitter.emit('cleared');
    }
    await this.setDefault(null);
  }

  public async allIDs (): Promise<string[]> {
    return await this.tokenStorage.allIDs();
  }

  public get size (): number {
    return this.credentialDataSource.size;
  }

  protected async loadDefaultCredential (): Promise<Credential | null> {
    const defaultTokenId = this.tokenStorage.defaultTokenId;
    if (!defaultTokenId) {
      return null;
    }
    let cred: Credential | null = null;
    try {
      cred = await this.with(defaultTokenId);
    }
    // eslint-disable-next-line no-empty
    catch (err) {}    // suppress error, if not found
    if (!cred) {
      // if credential cannot be found in storage, update stored default to reflect
      await this.tokenStorage.setDefaultTokenId(null);
    }
    return cred;
  }
}
