import type { Credential } from './Credential';
import { type JsonPrimitive, shortID, Token, EventEmitter } from '@okta/auth-foundation';
import type OAuth2Client from '@okta/auth-foundation/client';
import { DefaultCredentialDataSource, type CredentialDataSource } from './CredentialDataSource';
import { BrowserTokenStorage, TokenStorage } from './TokenStorage';
import {
  EVENT_EXPIRED,
  // EVENT_REFRESHED,
  EVENT_ADDED,
  EVENT_REMOVED,
  EVENT_DEFAULT_CHANGED,
  EVENT_REFRESHED,
  EVENT_CLEARED
} from './constants';

// TODO: for development
// function log (...args: any[]) {
//   console.log(...args);
// }
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function log (...args: any[]) {}

class CredentialCoordinatorEventEmitter extends EventEmitter {
  cleared () {
    this.emit(EVENT_CLEARED, {});
  }

  expired (credential: Credential) {
    this.emit(EVENT_EXPIRED, credential);
  }

  refreshed(credential: Credential) {
    this.emit(EVENT_REFRESHED, { credential });
  }

  defaultChanged (id: string | null) {
    this.emit(EVENT_DEFAULT_CHANGED, { id });
  }
}

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
  emitter: CredentialCoordinatorEventEmitter;
  /**
   * Represents {@link Credential.default}, backed by {@link CredentialCoordinator.tokenStorage | TokenStorage}
   */
  default: Credential | null;
  tokenStorage: TokenStorage;
  /**
   * Writes the provided {@link Token} (and {@link Token.Metadata}) to storage and creates a {@link Credential}
   * instance to represent the {@link Token} via the {@link CredentialDataSource}
   * 
   * @param token - the {@link Token} to store
   * @param tags - an array of developer-provided tags to associate with a {@link Token}.
   * Used by {@link Credential.find} queries
   */
  store (token: Token, tags: string[]): Credential;
  /**
   * Retrieves a {@link Credential} for the provided `id` from storage
   */
  with (id: string): Credential | null;
  /**
   * Uses stored {@link Token.Metadata} to match stored {@link Token}s by certain criteria
   */
  find (matcher: (meta: Token.Metadata) => boolean): Credential[];
  /**
   * Removes the provided {@link Credential} from storage and {@link CredentialDataSource}
   * 
   * @remarks
   * **NOTE:** This does *not* {@link Credential.revoke | revoke} tokens!
   */
  remove (cred: Credential): void;
  /**
   * Clears both {@link TokenStorage} and {@link CredentialDataSource}
   * 
   * @remarks
   * **NOTE:** This does *not* {@link Credential.revoke | revoke} tokens!
   */
  clear (): void;
  /**
   * Returns all {@link Token.id | ids} in storage
   */
  allIDs (): string[];
  /**
   * Returns the number of recorded {@link Credential} instances in the {@link CredentialDataSource}
   */
  readonly size: number;
}

/** @internal */
export class CredentialCoordinatorImpl implements CredentialCoordinator {
  readonly emitter = new CredentialCoordinatorEventEmitter();
  private readonly expiryTimeouts: { [key: string]: NodeJS.Timeout } = {};

  // shortID assoicated with instance to prevent listening to messages broadcasted by this instance
  private readonly id: string = shortID();
  private readonly channel: BroadcastChannel = new BroadcastChannel('CredentialCoordinatorImpl');

  #default: Credential | null | undefined = undefined;

  // configurations
  private readonly autoClean: boolean;

  private readonly credentialDataSource: CredentialDataSource;
  public readonly tokenStorage: TokenStorage;

  constructor (CredentialConstructor: new (token: Token, client: OAuth2Client) => Credential) {
    this.credentialDataSource = new DefaultCredentialDataSource(CredentialConstructor);

    this.tokenStorage = new BrowserTokenStorage();

    // parse out config options
    this.autoClean = false;   // TODO: fix auto clean

    this.emitter.relay(this.credentialDataSource.emitter, ['credential_added', 'credential_removed']);
    this.emitter.relay(this.tokenStorage.emitter, ['default_changed', 'token_replaced']);

    // emitter listeners need to be registered before storage is checked for existing tokens
    // loading the existing tokens will fire tokenStorage events which should be handled
    this.registerDelegateListeners();
    this.registerTabListeners();
  }

  private broadcast (eventName: string, data: Record<string, JsonPrimitive>) {
    this.channel.postMessage({
      eventName,
      source: this.id,    // id associated with CredentialCoordinator instance (aka per tab)
      ...data
    });
  }

  private registerTabListeners (): void {
    // eslint-disable-next-line max-statements
    this.channel.onmessage = (event) => {
      const { eventName, id, value, source } = event.data;
      log('tab sync event: ', { eventName, source });
      log(source, this.id, source === this.id);
      if (source == this.id) {
        log('prevented');
        return;   // do not listen to messages broadcasted by this instance
      }

      // special case
      if (eventName === EVENT_DEFAULT_CHANGED) {
        log('default', id, this.default);
        if (id === this.default?.id) {
          return;
        }

        this.tokenStorage.setDefaultTokenId(id);
        return;
      }

      // special case
      if (eventName === EVENT_CLEARED) {
        this.clear(true);   // only clear local values and do not broadcast
        this.emitter.cleared();
        return;
      }

      // CRUD events
      const token = new Token({...(value ?? {}), id});
      const cred = this.credentialDataSource.credentialFor(token);
      if (eventName === EVENT_ADDED) {
        log('added');
      }
      else if (eventName === EVENT_REMOVED) {
        log('removal');
        this.credentialDataSource.remove(cred);
      }
      else if (eventName === EVENT_REFRESHED) {
        log('refresh');
        // when a Credential is updated in a separate tab, the Token passed via the broadcast
        // may differ from cred.token via DataSource, so the update should continue. 
        // If the tokens are equal, this means this DataSource has already updated the token to the new value
        if (Token.isEqual(token, cred.token)) {
          log('token has already been updated');
          return;
        }

        // @ts-expect-error - Credential `set token()` is a private setter to avoid exposing this to the public API
        cred.token = token;
        this.emitter.refreshed(cred);
        return;
      }
      log('allIDs: ', this.allIDs());
    };
  }

  private registerDelegateListeners (): void {
    this.credentialDataSource.emitter.on('credential_added', ({ credential }) => {
      if (!credential.token.isExpired) {
        this.addExpireEventTimeout(credential);
      }
      credential.oauth2.emitter.on('token_did_refresh', ({ token }) => {
        if (!token || credential.id !== token.id) { return; }
        try {
          this.tokenStorage.replace(token.id, token);
          this.clearExpireEventTimeout(credential.id);
          this.addExpireEventTimeout(credential);
          this.emitter.refreshed(credential);
        }
        catch (err) {
          console.error('Failed to replace token after refresh');
        }
        this.broadcast(EVENT_REFRESHED, { id: token.id, value: token.toJSON() });
      });
    });

    this.credentialDataSource.emitter.on('credential_removed', ({ credential }) => {
      this.clearExpireEventTimeout(credential.id);
    });

    this.tokenStorage.emitter.on('token_added', ({ token }) => {
      this.broadcast(EVENT_ADDED, { id: token.id, value: token.toJSON() });
    });

    this.tokenStorage.emitter.on('token_removed', ({ id }) => {
      this.broadcast(EVENT_REMOVED, { id });
    });

    this.tokenStorage.emitter.on('default_changed', ({ id }) => {
      if (this.#default?.id === id) {
        return;
      }

      this.#default = this.loadDefaultCredential();
      this.broadcast(EVENT_DEFAULT_CHANGED, { id: this.default?.id ?? null });
    });
  }

  private clearExpireEventTimeout(id: string) {
    clearTimeout(this.expiryTimeouts[id]);
    delete this.expiryTimeouts[id];
  }

  private addExpireEventTimeout(cred: Credential) {
    this.clearExpireEventTimeout(cred.id);
    this.expiryTimeouts[cred.id] = setTimeout(() => {
      this.emitter.expired(cred);
    }, cred.token.expiresIn * 1000);
  }

  public get default (): Credential | null {
    if (this.#default === undefined) {
      this.#default = this.loadDefaultCredential();
    }
    return this.#default;
  }

  public set default (cred: Credential | null) {
    this.tokenStorage.setDefaultTokenId(cred?.id ?? null);
    this.#default = cred;
  }

  // TODO: patch auto clean
  public store(token: Token, tags: string[] = []): Credential {
    // let didAutoCleanRemoveDefault = false;
    // if (this.autoClean) {
    //   didAutoCleanRemoveDefault = this.execAutoClean(token, tags);
    // }
    const metadata = Token.Metadata(token, tags);
    this.tokenStorage.add(token, metadata);
    const cred = this.credentialDataSource.credentialFor(token);
    return cred;
  }

  public with(id: string): Credential | null {
    const token = this.tokenStorage.get(id);
    if (token) {
      return this.credentialDataSource.credentialFor(token);
    }

    return null;
  }

  public find(matcher: (metadata: Token.Metadata) => boolean): Credential[] {
    return this.allIDs().reduce<Credential[]>((acc: Credential[], id: string): Credential[] => {
      const metadata = this.tokenStorage.getMetadata(id);
      if (metadata && matcher(metadata)) {
        const cred = this.with(metadata.id);
        // if metadata exist, cred should always exist. Simply a sanity check
        if (cred) {
          acc.push(cred);
        }
      }
      return acc;
    }, []);
  }

  public remove(cred: Credential): void {
    this.tokenStorage.remove(cred.id);
    this.credentialDataSource.remove(cred);
  }

  public clear (localOnly = false): void {
    this.default = null;
    Object.keys(this.expiryTimeouts).forEach(t => this.clearExpireEventTimeout(t));
    this.credentialDataSource.clear();
    if (!localOnly) {
      this.tokenStorage.clear();
      this.emitter.cleared();
      this.broadcast(EVENT_CLEARED, {});
    }
  }

  public allIDs (): string[] {
    return this.tokenStorage.allIDs();
  }

  public get size(): number {
    return this.credentialDataSource.size;
  }

  private loadDefaultCredential (): Credential | null {
    const defaultTokenId = this.tokenStorage.defaultTokenId;
    if (!defaultTokenId) {
      return null;
    }
    let cred: Credential | null = null;
    try {
      cred = this.with(defaultTokenId);
    }
    // eslint-disable-next-line no-empty
    catch (err) {}    // suppress error, if not found
    if (!cred) {
      // if credential cannot be found in storage, update stored default to reflect
      this.tokenStorage.setDefaultTokenId(null);
    }
    return cred;
  }

  // // TODO: move this to TokenStorage
  // // removes any expired tokens which match the same scopes
  // // (and optionally tags) as a specific token (called in .store())
  // private execAutoClean(token: Token, tags: string[] = []) {
  //   const { suppressEvents, expiredOnly, matchTags } = getConfig().autoCleanOpts;

  //   // filter stored cred list to creds which match scopes (and optionally tags)
  //   const creds = this.find(({ id, scopes, tags: _tags }) => {
  //     if (matchTags && !hasSameValues(tags, _tags ?? [])) {
  //       return false;
  //     }
  //     return id !== token.id && hasSameValues(token.scopes, scopes);
  //   });
  //   let removedDefault = false;
  //   creds.forEach(cred => {
  //     if ((expiredOnly && cred.token.isExpired) || !expiredOnly) {
  //       // TODO: update to adhere to new default pattern
  //       // if (this.getMeta(cred)?.isDefault) {
  //       //   removedDefault = true;
  //       // }
  //       // removed tokens events will be supressed by default when a token is removed via autoClean
  //       // this.remove(cred, { suppressEvents });
  //     }
  //   });
  //   return removedDefault;
  // }
}
