/**
 * @module
 * @mergeModuleWith Credential
 */

import type { Token } from '../Token.ts';
import type { Credential } from './Credential.ts';
import { EventEmitter } from '../utils/EventEmitter.ts';
import { OAuth2Client } from '../oauth2/client.ts';
import { ConfigurationParams } from '../types/index.ts';


export type CredentialDataSourceEvents = {
  credential_added: { dataSource: CredentialDataSource, credential: Credential };
  credential_removed: { dataSource: CredentialDataSource, id: string };
};

/**
 * @public @interface
 * 
 * Prevents multiple instances of {@link Credential} from existing for the same {@link Token.Token | Token}
 * 
 * @remarks
 * Default implementation provided
 */
export interface CredentialDataSource {
  readonly emitter: EventEmitter<CredentialDataSourceEvents>;
  /**
   * Returns the number of {@link Credential}s recorded in the {@link CredentialDataSource}
   */
  readonly size: number;
  /**
   * Checks {@link CredentialDataSource} for an existing {@link Credential} instance which
   * represents the provided {@link Token.Token | Token}.
   */
  hasCredential (token: Token): boolean;
  /**
   * Checks {@link CredentialDataSource} for an existing {@link Credential} instance which
   * represents the provided {@link Token.Token | Token}. If one does not exist, a new {@link Credential}
   * instance is created (and recorded within the {@link CredentialDataSource})
   */
  credentialFor (token: Token, metadata?: Token.Metadata): Credential;
  /**
   * Removes provided {@link Credential} instance from the {@link CredentialDataSource}
   * 
   * @remarks
   * **NOTE:** This does *not* {@link Credential.revoke | revoke} the represented token.
   * They are only removed from the {@link CredentialDataSource}!
   */
  remove (cred: Credential | string): void;
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
export class DefaultCredentialDataSource implements CredentialDataSource {
  protected readonly credentials: Map<string, Credential> = new Map();
  readonly emitter: EventEmitter<CredentialDataSourceEvents> = new EventEmitter();

  // Credential constructor must be passed in to avoid circular dependency
  constructor (protected readonly CredentialConstructor: new (...args: ConstructorParameters<typeof Credential>) => Credential) {}

  protected createOAuth2Client (params: ConfigurationParams): OAuth2Client {
    return new OAuth2Client(params);
  }

  // moving `new Credential` to protected method to ease testing
  // it is weirdly difficult to spy on Constructors in jest
  protected createCredential (token: Token, metadata?: Token.Metadata) {
    const { issuer, clientId, scopes, dpopPairId } = token.context;
    const dpop = token.tokenType === 'DPoP' && !!dpopPairId;
    const client = this.createOAuth2Client({ baseURL: issuer, clientId, scopes, dpop });

    return new this.CredentialConstructor(token, client, metadata);
  }

  public hasCredential (token: Token): boolean {
    return this.credentials.has(token.id);
  }

  public credentialFor (token: Token, metadata?: Token.Metadata): Credential {
    if (this.credentials.has(token.id)) {
      // .has() was used to confirm existence
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return this.credentials.get(token.id)!;
    }

    const credential = this.createCredential(token, metadata);  // see note above method
    this.credentials.set(token.id, credential);
    this.emitter.emit('credential_added', { dataSource: this, credential });
    return credential;
  }

  public remove (cred: Credential | string) {
    const id = typeof cred === 'string' ? cred : cred.id;
    if (this.credentials.has(id)) {
      const cred = this.credentials.get(id)!;
      this.credentials.delete(id);
      this.emitter.emit('credential_removed', { dataSource: this, id: cred.id });
    }
  }

  public clear () {
    this.credentials.clear();
  }

  public get size (): number {
    return this.credentials.size;
  }
}
