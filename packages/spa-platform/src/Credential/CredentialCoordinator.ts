/**
 * @packageDocumentation
 * @internal
 */

import type {
  TokenStorage,
  JsonPrimitive,
  TokenStorageEvents,
  JsonRecord,
  Credential
} from '@okta/auth-foundation/core';
import {
  Token,
  CredentialCoordinator,
  CredentialCoordinatorImpl as CredentialCoordinatorBase,
  shortID,
  pause,
} from '@okta/auth-foundation/core';
import { DefaultCredentialDataSource } from './CredentialDataSource.ts';
import { BrowserTokenStorage } from './TokenStorage.ts';
import { isFirefox } from '../utils/UserAgent.ts';


// TODO: for development
// function log (...args: any[]) {
//   console.log(...args);
// }
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function log (...args: any[]) {}

/**
 * @internal
 * 
 * NOTE: If any changes are made to the payload structure of the tab sync events
 * increment this version variable.
 */
const BROADCAST_MESSAGE_VERSION = 2;

type BroadcastMessage = { eventName: string, id: string, source: string, v: number };

/**
 * Browser-specific implementation of {@link CredentialCoordinator}
 *
 * @internal
 */
export class CredentialCoordinatorImpl extends CredentialCoordinatorBase implements CredentialCoordinator {
  // shortID assoicated with instance to prevent listening to messages broadcasted by this instance
  private readonly id: string = shortID();
  // lazily created: only opened once `enableTabSync()` is called
  private channel?: BroadcastChannel;

  constructor (CredentialConstructor: (ConstructorParameters<typeof CredentialCoordinatorBase>)[0]) {
    super(CredentialConstructor);
    this.tokenStorage = new BrowserTokenStorage();
    this.credentialDataSource = new DefaultCredentialDataSource(CredentialConstructor);
  }

  /**
   * Opts in to broadcasting credential lifecycle events (add/remove/refresh/default/metadata)
   * across browser tabs via `BroadcastChannel`, so state stays in sync everywhere.
   *
   * @remarks
   * Disabled by default. Call once, e.g. at application startup.
   */
  public enableTabSync (): void {
    if (this.channel) {
      return;
    }
    this.channel = new BroadcastChannel(`TabSync:v${BROADCAST_MESSAGE_VERSION}`);
    this.registerTabListeners();
    this.bindBroadcastListeners(this.tokenStorage);
    this.emitter.on('credential_refreshed', this.broadcastCredentialRefreshed);
  }

  /**
   * Opts out of cross-tab broadcasting, closing the underlying `BroadcastChannel`.
   */
  public disableTabSync (): void {
    if (!this.channel) {
      return;
    }
    this.emitter.off('credential_refreshed', this.broadcastCredentialRefreshed);
    this.unbindBroadcastListeners(this.tokenStorage);
    this.close();
    this.channel = undefined;
  }

  private readonly broadcastCredentialRefreshed = ({ credential }: { credential: Credential }): void => {
    this.broadcast('credential_refreshed', { id: credential.id });
  };

  // NOTE: getter is required to be defined since setter is defined
  public get tokenStorage (): TokenStorage {
    return super.tokenStorage;
  }

  public set tokenStorage (tokenStorage: TokenStorage) {
    if (super.tokenStorage) {
      this.unbindBroadcastListeners(super.tokenStorage);
    }

    super.tokenStorage = tokenStorage;

    if (this.channel) {
      this.bindBroadcastListeners(tokenStorage);
    }
  }

  private bindBroadcastListeners (tokenStorage: TokenStorage): void {
    tokenStorage.emitter.on('token_added', ({ token }) => {
      this.broadcast('credential_added', { id: token.id });
    });

    tokenStorage.emitter.on('token_removed', ({ id }) => {
      this.broadcast('credential_removed', { id });
    });

    tokenStorage.emitter.on('default_changed', ({ id }) => {
      this.broadcast('default_changed', { id });
    });

    tokenStorage.emitter.on('metadata_updated', ({ id }) => {
      this.broadcast('metadata_updated', { id });
    });
  }

  private unbindBroadcastListeners (tokenStorage: TokenStorage): void {
    ([
      'token_added',
      'token_removed',
      'default_changed',
      'metadata_updated',
    ] satisfies (keyof TokenStorageEvents)[]).forEach(evt => tokenStorage.emitter.off(evt));
  }

  protected broadcast (eventName: string, data: Record<string, JsonPrimitive | JsonRecord>) {
    if (!this.channel) {
      return;   // tab sync not enabled
    }
    try {
      this.channel.postMessage({
        eventName,
        source: this.id,    // id associated with CredentialCoordinator instance (aka per tab)
        v: BROADCAST_MESSAGE_VERSION,   // increment this version when changes are made to tab sync message structure
        ...data
      });
    }
    catch (err) {
      // don't leak broadcast errors
    }
  }

  protected registerTabListeners (): void {
    if (!this.channel) {
      return;
    }
    // eslint-disable-next-line max-statements, complexity
    this.channel.onmessage = async (event) => {
      try {
        // TODO: investigate better solution
        if (isFirefox()) {
          // Issue: `credential_added` event is receieved by other tabs before the storage event is
          // Firefox seems to have a local cache of LocalStorage per tab which is not updated until the storage event
          // is received by that tab. The delay (usually ~.0001 ms) is enough to cause `Credential.allIds()` to return
          // an incorrect value when used in an `credential_added` event handler in another tab
          // This issue has not been observed on Chromium browsers
          // (https://stackoverflow.com/questions/57089227/inconsistency-when-writing-synchronous-to-localstorage-from-multiple-tabs)
          await pause(50);
        }

        const { eventName, id, source, v } = event.data as BroadcastMessage;
        log('tab sync event: ', { eventName, source });
        if (source == this.id) {
          return;   // do not listen to messages broadcasted by this instance
        }

        if (v !== BROADCAST_MESSAGE_VERSION) {
          log(`version mismatch: ${v} vs ${BROADCAST_MESSAGE_VERSION}. Ignoring message`);
          return;
        }

        if (eventName === 'default_changed') {
          log('default', id, this._default);
          if (id !== this._default?.id) {
            // clear the cache (rather than writing through `setDefault`/`setDefaultTokenId`) so this doesn't
            // itself emit a local `default_changed` on `tokenStorage`, which would get broadcast right back
            // out and loop between tabs; the id is already persisted by the tab that made the change
            this._default = undefined;
            this.emitter.emit('default_changed', { storage: this.tokenStorage, id });
          }
        }
        else if (eventName === 'cleared') {
          await this.clear(true);   // only clear local values and do not broadcast
          this.emitter.emit('cleared');
        }
        else if (eventName === 'metadata_updated') {
          // loads metadata from storage
          const metadata = await this.tokenStorage.getMetadata(id);
          if (metadata) {
            this.emitter.emit('metadata_updated', { storage: this.tokenStorage, id, metadata });
          }
        }
        else if (eventName === 'credential_added') {
          log('added');
          this.emitter.emit('credential_added', { id });
          // NOTE: cross-tab 'credential_added' no longer defaults to adding a `Credential` instance to `dataSource`
        }
        else if (eventName === 'credential_removed') {
          log('removal');
          if (this.credentialDataSource.hasCredential(id)) {
            // if a `Credential` exists for the given token, a event will be relayed via `dataSource.emitter`
            this.credentialDataSource.remove(id);
          }
          else {
            // No event will be relayed if a `Credential` exists does not exist, emit one directly
            this.emitter.emit('credential_removed', { id });
          }
        }
        else if (eventName === 'credential_refreshed') {
          log('refresh');

          // if the tab receiving this event does not "know" (have a corresponding `Credential` instance)
          // for the token which refresh, skip processing this event
          if (!this.credentialDataSource.hasCredential(id)) {
            log('token not known to tab');
            return;
          }

          const token = await this.tokenStorage.get(id);
          if (!token) {
            return;
          }
          const credential = this.credentialDataSource.credentialFor(token);

          // when a Credential is updated in a separate tab, the Token read from storage
          // may differ from cred.token via DataSource, so the update should continue.
          // If the tokens are equal, this means this DataSource has already updated the token to the new value
          if (Token.isEqual(token, credential.token)) {
            log('token has already been updated');
            return;
          }

          // @ts-expect-error - Credential `set token()` is a private setter to avoid exposing this to the public API
          credential.token = token;
          this.emitter.emit('credential_refreshed', { credential });
        }

        log('allIDs: ', this.allIDs(), 'size: ', this.credentialDataSource.size);
      }
      catch (err) {
        log('error caught: ', err);
      }
    };
  }

  public async clear (localOnly = false): Promise<void> {
    await super.clear(localOnly);
    if (!localOnly) {
      this.broadcast('cleared', {});
    }
  }

  /**
   * Closes the underlying BroadcastChannel, useful for testing environments to avoid open handles
   *
   * @see
   * {@link https://jestjs.io/docs/cli#--detectopenhandles | jest --detectOpenHandles}
   */
  public close () {
    if (!this.channel) {
      return;
    }
    this.channel.onmessage = null;
    this.channel.close();
  }
}
