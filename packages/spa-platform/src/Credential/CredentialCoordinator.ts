/**
 * @packageDocumentation
 * @internal
 */

import type {
  TokenStorage,
  JsonPrimitive,
  TokenStorageEvents,
  JsonRecord,
  TokenInit,
} from '@okta/auth-foundation';
import {
  CredentialCoordinator,
  CredentialCoordinatorImpl as CredentialCoordinatorBase,
  shortID,
  pause,
} from '@okta/auth-foundation';
import { Token } from '../platform/index.ts';
import { DefaultCredentialDataSource } from './CredentialDataSource.ts';
import { BrowserTokenStorage } from './TokenStorage.ts';
import { isFirefox } from '../utils/UserAgent.ts';


// TODO: for development
// function log (...args: any[]) {
//   console.log(...args);
// }
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function log (...args: any[]) {}


type BroadcastMessage = { eventName: string, id: string, source: string, value: JsonRecord };

/**
 * Browser-specific implementation of {@link CredentialCoordinator}
 * 
 * @internal
 */
export class CredentialCoordinatorImpl extends CredentialCoordinatorBase implements CredentialCoordinator {
  // shortID assoicated with instance to prevent listening to messages broadcasted by this instance
  private readonly id: string = shortID();
  private readonly channel: BroadcastChannel = new BroadcastChannel('CredentialCoordinatorImpl');

  constructor (CredentialConstructor: (ConstructorParameters<typeof CredentialCoordinatorBase>)[0]) {
    super(CredentialConstructor);
    this.tokenStorage = new BrowserTokenStorage();
    this.credentialDataSource = new DefaultCredentialDataSource(CredentialConstructor);

    this.registerTabListeners();

    this.emitter.on('credential_refreshed', ({ credential }) => {
      const { token } = credential;
      this.broadcast('credential_refreshed', { id: token.id, value: token.toJSON() });
    });
  }

  // NOTE: getter is required to be defined since setter is defined
  public get tokenStorage (): TokenStorage {
    return super.tokenStorage;
  }

  public set tokenStorage (tokenStorage: TokenStorage) {
    if (super.tokenStorage) {
      ([
        'token_added',
        'token_removed',
        'default_changed',
        'metadata_updated',
      ] satisfies (keyof TokenStorageEvents)[]).forEach(evt => super.tokenStorage.emitter.off(evt));
    }

    super.tokenStorage = tokenStorage;

    this.tokenStorage.emitter.on('token_added', ({ token }) => {
      this.broadcast('credential_added', { id: token.id, value: token.toJSON() });
    });

    this.tokenStorage.emitter.on('token_removed', ({ id }) => {
      this.broadcast('credential_removed', { id });
    });

    this.tokenStorage.emitter.on('default_changed', ({ id }) => {
      this.broadcast('default_changed', { id });
    });

    this.tokenStorage.emitter.on('metadata_updated', ({ id }) => {
      this.broadcast('metadata_updated', { id });
    });
  }

  protected broadcast (eventName: string, data: Record<string, JsonPrimitive | JsonRecord>) {
    this.channel.postMessage({
      eventName,
      source: this.id,    // id associated with CredentialCoordinator instance (aka per tab)
      ...data
    });
  }

  protected registerTabListeners (): void {
    // eslint-disable-next-line max-statements
    this.channel.onmessage = async (event) => {
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

      const { eventName, id, value, source } = event.data as BroadcastMessage;
      log('tab sync event: ', { eventName, source });
      if (source == this.id) {
        return;   // do not listen to messages broadcasted by this instance
      }

      if (eventName === 'default_changed') {
        log('default', id, this._default);
        if (id !== this._default?.id) {
          this._default = undefined;    // set to undefined to trigger "reload" when accessed after this event
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
      else {
        const token = new Token({ ...value, id } as TokenInit);

        if (eventName === 'credential_removed') {
          log('removal');
          if (this.credentialDataSource.hasCredential(token)) {
            this.credentialDataSource.remove(id);
          }
          else {
            // TODO: is this needed?
            // ensures removal event is broadcast, regardless of the DataSource knowledge of the Credential
            this.emitter.emit('credential_removed', { dataSource: this.credentialDataSource, id });
          }
        }
        else {
          const credential = this.credentialDataSource.credentialFor(token);

          if (eventName === 'credential_added') {
            log('added');
            // credentialDataSource.credentialFor() call above handles updating credDataSrc
          }
          else if (eventName === 'credential_refreshed') {
            log('refresh');

            // when a Credential is updated in a separate tab, the Token passed via the broadcast
            // may differ from cred.token via DataSource, so the update should continue.
            // If the tokens are equal, this means this DataSource has already updated the token to the new value
            // eslint-disable-next-line max-depth
            if (Token.isEqual(token, credential.token)) {
              log('token has already been updated');
              return;
            }

            // @ts-expect-error - Credential `set token()` is a private setter to avoid exposing this to the public API
            credential.token = token;
            this.emitter.emit('credential_refreshed', { credential });
          }
        }
      }

      log('allIDs: ', this.allIDs(), 'size: ', this.credentialDataSource.size);
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
    this.channel.close();
  }
}
