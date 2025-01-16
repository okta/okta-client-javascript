import { type Token, EventEmitter } from '@okta/auth-foundation';
import type Credential from './Credential';
import OAuth2Client from '@okta/auth-foundation/client';


/**
 * 
 */
class CredentialDataSourceEventEmitter extends EventEmitter {
  credentialAdded (dataSource: CredentialDataSource, credential: Credential) {
    const event: CredentialDataSourceDelegate.CredentialAdded = { dataSource, credential };
    this.emit('credential_added', event);
  }

  credentialRemoved (dataSource: CredentialDataSource, credential: Credential) {
    const event: CredentialDataSourceDelegate.CredentialRemoved = { dataSource, credential };
    this.emit('credential_removed', event);
  }
}

/** @internal */
export namespace CredentialDataSourceDelegate {
  export type Events = 'credential_added' | 'credential_removed';

  type CredentialDataSourceDelegateEvent = {
    dataSource:  CredentialDataSource;
    credential: Credential;
  }

  export type CredentialAdded = CredentialDataSourceDelegateEvent;

  export type CredentialRemoved = CredentialDataSourceDelegateEvent;
}

/**
 * @public @interface
 * 
 * Prevents multiple instances of {@link Credential} from existing for the same {@link Token}
 * 
 * @remarks
 * Default implementation provided
 */
export interface CredentialDataSource {
  // TODO: doc events
  readonly emitter: CredentialDataSourceEventEmitter;
  /**
   * Returns the number of {@link Credential}s recorded in the {@link CredentialDataSource}
   */
  readonly size: number;
  /**
   * Checks {@link CredentialDataSource} for an existing {@link Credential} instance which
   * represents the provided {@link Token}.
   */
  hasCredential (token: Token): boolean;
  /**
   * Checks {@link CredentialDataSource} for an existing {@link Credential} instance which
   * represents the provided {@link Token}. If one does not exist, a new {@link Credential}
   * instance is created (and recorded within the {@link CredentialDataSource})
   */
  credentialFor (token: Token): Credential;
  /**
   * Removes provided {@link Credential} instance from the {@link CredentialDataSource}
   * 
   * @remarks
   * **NOTE:** This does *not* {@link Credential.revoke | revoke} the represented token.
   * They are only removed from the {@link CredentialDataSource}!
   */
  remove (cred: Credential): void;
  /**
   * Clears all {@link Credential} instances from the {@link CredentialDataSource}
   * 
   * @remarks
   * **NOTE:** This does *not* {@link Credential.revoke | revoke} tokens.
   * They are only removed from the {@link CredentialDataSource}!
   */
  clear (): void;
}

/** @internal */
export class DefaultCredentialDataSource<T extends Credential = Credential> implements CredentialDataSource {
  // This class uses a generic to prevent the circular dependency of Cred -> CDS -> Cred

  private readonly credentials: Map<string, T> = new Map();
  readonly emitter: CredentialDataSourceEventEmitter = new CredentialDataSourceEventEmitter();

  // Credential constructor must be passed in generic<T> can only be referenced as a type
  constructor(private readonly CredentialConstructor: new (token: Token, client: OAuth2Client) => T) {}

  // moving `new Credential` to private method to ease testing
  // it is weirdly difficult to spy on Constructors in jest
  private createCredential (token: Token) {
    const { issuer, clientId, scopes, dpopPairId } = token.context;
    const dpop = token.tokenType === 'DPoP' && !!dpopPairId;
    const client = new OAuth2Client({ baseURL: issuer, clientId, scopes, dpop });

    return new this.CredentialConstructor(token, client);
  }

  public hasCredential (token: Token): boolean {
    return this.credentials.has(token.id);
  }

  public credentialFor (token: Token): T {
    if (this.credentials.has(token.id)) {
      // .has() was used to confirm existence
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return this.credentials.get(token.id)!;
    }

    const cred = this.createCredential(token);  // see note above method
    this.credentials.set(token.id, cred);
    this.emitter.credentialAdded(this, cred);
    return cred;
  }

  public remove (cred: Credential | string) {
    const id = typeof cred === 'string' ? cred : cred.id;
    if (this.credentials.has(id)) {
      const cred = this.credentials.get(id)!;
      this.credentials.delete(id);
      this.emitter.credentialRemoved(this, cred);
    }
  }

  public clear () {
    this.credentials.clear();
  }

  public get size (): number {
    return this.credentials.size;
  }
}
