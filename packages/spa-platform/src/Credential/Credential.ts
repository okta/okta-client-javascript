import {
  Token,
  EventEmitter,
  Timestamp,
  isOAuth2ErrorResponse,
  OAuth2Error,
  type RequestAuthorizer,
} from '@okta/auth-foundation';
import OAuth2Client from '@okta/auth-foundation/client';
import { type CredentialCoordinator, CredentialCoordinatorImpl } from './CredentialCoordinator';
import { CredentialError } from './errors';
import { TokenKind } from './types';
import { EVENT_ADDED, EVENT_REMOVED, EVENT_REFRESHED } from './constants';

/**
 * @module Credential
 */

type seconds = number;

/** @internal */
export type CredentialMeta = {
  id: string;
} & Record<string, string | string[]>

/**
 * @internal
 */
class CredentialEventEmitter extends EventEmitter {
  credentialAdded(credential: Credential) {
    this.emit(EVENT_ADDED, { credential });
  }

  credentialRemoved (credential: Credential) {
    this.emit(EVENT_REMOVED, { id: credential.id });
  }
}

/**
 * Wrapper around a {@link Token}, providing methods to interact with Tokens without the hassle of managing them
 * 
 * @public
 */
export class Credential implements RequestAuthorizer {
  // TODO: define expected events
  protected static readonly emitter = new CredentialEventEmitter();

  /** @internal */
  static #coordinator: CredentialCoordinator = new CredentialCoordinatorImpl(this);

  static {
    this.emitter.relay(this.#coordinator.emitter, ['cleared', 'default_changed', EVENT_REFRESHED]);

    this.#coordinator.emitter.on('credential_added', ({ credential }) => {
      this.emitter.credentialAdded(credential);
    });

    this.#coordinator.emitter.on('credential_removed', ({ credential }) => {
      this.emitter.credentialRemoved(credential);
    });
  }

  /** @internal */
  private _token: Token;

  /** @internal */
  private _refreshPromise: Promise<void> | null = null;

  /** @internal */
  private _oauth2: OAuth2Client;

  private _metadata: Token.Metadata;

  // TODO: make this a private constructor?
  /**
   * @remarks
   * Do not use directly, use {@link store | Credential.store} instead
   */
  constructor (token: Token, client: OAuth2Client) {
    this._token = token;
    this._oauth2 = client;

    let metadata;
    try {
      // swallow storage errors when fetching metadata
      metadata = Credential.#coordinator.tokenStorage.getMetadata(this._token.id);
    }
    // eslint-disable-next-line no-empty
    catch (err) {}

    this._metadata = metadata ?? Token.Metadata(this._token);

    this.observeToken();
  }

  /**
   * Returns instance of {@link OAuth2Client} used to construct {@link Credential}
   * 
   * @public
   */
  get oauth2 (): OAuth2Client {
    return this._oauth2;
  }

  /////// public static methods ///////
  /**
   * Bind an event listener
   * 
   * @param event - event name
   * @param callback - event handler
   * 
   * @group Events
   * 
   * @example
   * Credential.on(Events.CREDENTIAL_REFRESHED, credential => {
   *   // do something with credential
   * });
   * 
   * @see {@link Events}
   */
  public static on (event: string, callback: (...args: any[]) => void) {
    Credential.emitter.on(event, callback);
  }

  /**
   * Removes active event listeners
   * 
   * @param event - event name
   * @param callback - the event handler previously bound via {@link on | Credential.on}
   * 
   * @group Events
   * 
   * @example
   * Credential.off(Events.CREDENTIAL_REFRESHED);
   * 
   * @see {@link Events}
   */
  public static off (event: string, callback?: (...args: any[]) => void) {
    Credential.emitter.off(event, callback);
  }

  /**
   * @group Static Accessors
   */
  public static get default (): Credential | null {
    return this.#coordinator.default;
  }
  /**
   * @group Static Accessors
   */
  public static set default (cred: Credential | null) {
    this.#coordinator.default = cred;
  }

  /**
   * Returns array of all Credential ids
   * 
   * @group Static Accessors
   */
  public static get allIDs (): string[] {
    return this.#coordinator.allIDs();
  }

  /**
   * Returns number of Credential instances
   * 
   * @group Static Accessors
   */
  public static get size (): number {
    return this.#coordinator.size;
  }

  /**
   * Writes `token` to storage and returns a {@link Credential} instance
   * 
   * @param token - Object representing the token to be managed by returned Credential instance
   * @param tags - List of strings that can be used to ease Credential retrieval
   * 
   * @example
   * const adminToken = await fetchAdminToken();
   * const token = new Token(adminToken);
   * Credential.store(token, ['admin']);
   * 
   * @group Factory Methods
   * 
   */
  public static store (token: Token, tags: string[] = []): Credential {
    return this.#coordinator.store(token, tags);
  }

  /**
   * Returns {@link Credential} instance with corresponding {@link Credential.id | id}
   * 
   * @remarks
   * This method can be used to retreive a specific {@link Credential}, however its recommended to use
   * {@link Credential.default} or {@link Credential.find} to query by {@link Credential.tags | tags} instead
   * 
   * @group Static Methods
   */
  public static with (id: string): Credential | null {
    return this.#coordinator.with(id);
  }

  // TODO: better document `CredentialMeta`
  /**
   * Returns all Credential instances where `matcher` function returns `true`
   * 
   * @param matcher - Function which takes `meta` as first argument. Returns `true` if Credential should
   * be included. `false` otherwise
   * 
   * @group Static Methods
   * 
   * @example
   * // find Credentials by tag 'foo'
   * Credential.find(meta => meta?.tags?.includes('foo'));
   */
  public static find (matcher: (meta: CredentialMeta) => boolean): Credential[] {
    return this.#coordinator.find(matcher);
  }

  /**
   * Removes all {@link Credential} instances and clears storage
   * 
   * @group Static Methods
   */
  public static clear () {
    this.#coordinator.clear();
  }

  /**
   * Compares 2 Credential instances to determine if they represent the same token
   * 
   * @group Static Methods
   */
  public static isEqual (lhs: Credential, rhs: Credential) {
    return Token.isEqual(lhs.token, rhs.token);
  }

  // helper methods

  /**
   * The {@link Token} instance {@link Credential} is associated with
   * 
   * @remarks
   * This value may change, from operations like {@link renew},
   * however the {@link Token.id | Token.id} will remain consistent
   */
  public get token (): Token {
    return this._token;
  }

  /** @internal */
  // confirms token ids match, then sets new token value
  private set token (token: Token) {
    if (this._token) {
      // redundant, but important to ensure token ids remain consistent
      if (this._token.id !== token.id) {
        throw new CredentialError('Unrelated token. ids do not match');
      }
    }
    this._token = token;
  }

  /**
   * Short for `this.token.id`
   */
  public get id () {
    return this.token.id;
  }

  /**
   * Array of tags associated with {@link Credential}. Used for retrieval
   */
  public get tags (): string[] {
    return this._metadata?.tags ?? [];
  }

  /////// public instances methods ///////

  /**
   * Updates tags associated with {@link Credential}
   * 
   * @remarks
   * This is *not* merge operation
   * 
   * @param tags - tags to be associated with {@link Credential}
   */
  public setTags (tags: string[] = []) {
    const metadata = Token.Metadata(this.token, tags);
    Credential.#coordinator.tokenStorage.setMetadata(metadata);
    this._metadata = metadata;
  }

  /**
   * Removes {@link Credential} from storage
   * 
   * @remarks
   * **NOTE:** this method *does not* revoke tokens
   * 
   * @see {@link revoke | Credential.prototype.revoke}
   */
  public remove () {
    return Credential.#coordinator.remove(this);
  }

  /**
   * Helper method to get a `Authorization` header, expressed as an object
   * 
   * @example
   * cred.getAuthHeader();
   * // { 'Authorization': 'Bearer ***********' }
   * 
   * @example
   * const data = await fetch('resource/server', { headers: { ...cred.getAuthHeader() }})
   * 
   */
  public getAuthHeader () {
    return {
      Authorization: `${this.token.tokenType} ${this.token.accessToken}`
    };
  }

  /**
   * A utility method which matches the signature of [fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
   * a [Request](https://developer.mozilla.org/en-US/docs/Web/API/Request) instance with a predefined `Authorization` header
   */
  public async authorize (input: string | URL | Request, init?: RequestInit) {
    return this.token.authorize(input, init);
  }

  // TODO: return metadata as well?
  public toJSON (): Record<string, any> {
    return this.token.toJSON();
  }

  /** @internal */
  private observeToken () {
    this.oauth2.emitter.on('token_did_refresh', ({ token }) => {
      if (Token.isEqual(token, this.token)) { return; }
      console.log('token observed to be refreshed');
      this.token = token;
    });
  }

  // oauth2 methods

  /**
   * Attempts to refresh the represented `token`
   * 
   * @remarks 
   * Upon successful renew, the `token` will be replaced with a new
   * {@link Token} instance, however the `id` property will remain consistent
   * 
   * @group OAuth2 Methods
   * 
   * @throws {@link OAuth2Error} if refresh fails
   */
  public async refresh (): Promise<void> {
    if (!this._refreshPromise) {
      this._refreshPromise = this.oauth2.refresh(this.token).then(response => {
        if (isOAuth2ErrorResponse(response)) {
          // TODO: handle error case
          // emit error?
          throw new OAuth2Error(response);
        }

        this.token = response;
      })
      .finally(() => {
        this._refreshPromise = null;
      });
    }

    return this._refreshPromise;
  }

  /**
   * Renews `token` if the will expire within the grace period
   * 
   * @remarks
   * Expiration calculation is performed on the browser via {@link TimeCoordinator}
   * 
   * @group OAuth2 Methods
   * 
   * @throws {@link OAuth2Error} if refresh fails
   */
  public async refreshIfNeeded (gracePeriod: seconds = 30): Promise<void> {
    const timestamp = Timestamp.from(this.token.expiresAt);
    if (timestamp.timeSinceNow() <= gracePeriod) {
      await this.refresh();
    }
  }

  /**
   * Revokes either {@link Token.accessToken | Credential.token.accessToken} or
   * {@link Token.refreshToken | Credential.token.refreshToken} or both
   * 
   * @remarks
   * * If `RevokeType.ALL`, {@link Credential} will be removed
   * 
   * @group OAuth2 Methods
   * 
   * @throws {@link OAuth2Error} if revocation fails
   */
  public async revoke (type: Token.RevokeType = 'ALL') {
    const shouldRemove = type === 'ALL' ||
      (type === 'REFRESH' && this.token.refreshToken) ||
      (type === 'ACCESS' && !this.token.refreshToken);

    const error = await this.oauth2.revoke(this.token, type);

    if (isOAuth2ErrorResponse(error)) {
      return error;
    }

    if (shouldRemove) {
      this.remove();
    }
  }

  /**
   * COMING SOON
   * Performs introspect on a specific token
   * 
   * @param kind - The specific token to introspect.
   * Must be available in {@link Credential.token | Credential.token}
   * 
   * @group OAuth2 Methods
   * 
   * @throws {@link OAuth2Error}
   */
  public async introspect (kind: TokenKind) {
    const token = this.token;
    if (!token[kind]) {
      // id or refresh tokens may not exist
      throw new Error(`Requested ${kind} token not available`);
    }
    // TODO: implement
  }

  /**
   * COMING SOON
   * Performs OIDC UserInfo request
   * 
   * @group OAuth2 Methods
   * 
   * @throws {@link OAuth2Error}
   */
  public async userInfo () {
    // TODO: implement
  }
}

export default Credential;
