/**
 * @module Credential
 */

import {
  isOAuth2ErrorResponse,
  type RequestAuthorizer,
  type RequestAuthorizerInit,
  type JsonRecord,
  type JSONSerializable,
  type Seconds
} from '../types/index.ts';
import type { OAuth2Client } from '../oauth2/client.ts';
import { Token } from '../Token.ts';
import { UserInfo } from '../oauth2/requests/UserInfo.ts';
import { EventEmitter } from '../utils/EventEmitter.ts';
import { Timestamp } from '../utils/TimeCoordinator.ts';
import { type CredentialCoordinator, type CredentialCoordinatorEvents, CredentialCoordinatorImpl } from './CredentialCoordinator.ts';
import { CredentialError, OAuth2Error } from '../errors/index.ts';


type CredentialEvents = {
  'credential_added': { credential: Credential };
  'credential_removed': { id: string };
  'tags_updated': { id: string, tags: string[] };
} & Omit<CredentialCoordinatorEvents, 'credential_added' | 'credential_removed'>;

/**
 * Wrapper around a {@link Token.Token | Token}, providing methods to interact with Tokens without the hassle of managing them
 * 
 * @public
 */
export class Credential implements RequestAuthorizer, JSONSerializable {
  protected static readonly emitter: EventEmitter<CredentialEvents> = new EventEmitter();

  /** @internal */
  protected static _coordinator: CredentialCoordinator =  new CredentialCoordinatorImpl(this);

  /** @internal */
  protected static get coordinator (): CredentialCoordinator {
    return this._coordinator;
  }

  /** @internal */
  protected static set coordinator (coordinator: CredentialCoordinator) {
    const previousCoordinator = this.coordinator;

    this._coordinator = coordinator;

    // unbinds listeners of previous coordinator
    ( [
        'credential_added', 'credential_removed', 'credential_refreshed', 'default_changed', 'cleared'
      ] satisfies (keyof CredentialCoordinatorEvents)[]
    ).forEach((evt) => previousCoordinator.emitter.off(evt));

    // binds listeners (and event relays) from coordinator to Credential.emitter
    this.emitter.relay(this.coordinator.emitter, ['cleared', 'default_changed', 'credential_refreshed']);

    this.coordinator.emitter.on('credential_added', ({ credential }) => {
      this.emitter.emit('credential_added', { credential });
    });

    this.coordinator.emitter.on('credential_removed', ({ id }) => {
      this.emitter.emit('credential_removed', { id });
    });
  }

  static {
    // sets a default `CredentialCoordinator` implementation
    // the getter/setter pattern allows derived (platform-specific) Coordinator impls
    // to simply set `this.coordinator = new PlatformImpl(this)` and still achieve the events binds
    this.coordinator = new CredentialCoordinatorImpl(this);
  }

  /** @internal */
  protected _token: Token;

  /** @internal */
  protected _refreshPromise: Promise<void> | null = null;

  /** @internal */
  protected _oauth2: OAuth2Client;

  /** @internal */
  protected _metadata: Token.Metadata;

  /** @internal */
  protected _userInfo: UserInfo | undefined;

  /**
   * @remarks
   * Do not use directly, use {@link store | Credential.store} instead
   */
  constructor (token: Token, client: OAuth2Client, metadata?: Token.Metadata) {
    this._token = token;
    this._oauth2 = client;
    this._metadata = metadata ?? Token.Metadata(token);

    this.observeToken();
  }

  /**
   * @internal
   * accesses a derived class' coordinator rather than the default Credential impl's
   */
  protected get coordinator (): CredentialCoordinator {
    return (this.constructor as typeof Credential).coordinator;
  }

  /**
   * Returns instance of {@link OAuth2.OAuth2Client | OAuth2Client} used to construct {@link Credential}
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
   */
  public static on (...args: Parameters<EventEmitter<CredentialEvents>['on']>) {
    Credential.emitter.on(...args);
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
   */
  public static off (...args: Parameters<EventEmitter<CredentialEvents>['off']>) {
    Credential.emitter.off(...args);
  }

  /**
   * @group Static Accessors
   */
  public static async getDefault (): Promise<Credential | null> {
    return await this.coordinator.getDefault();
  }
  /**
   * @group Static Accessors
   */
  public static async setDefault (cred: Credential | null): Promise<void> {
    await this.coordinator.setDefault(cred);
  }

  /**
   * Returns array of all Credential ids
   * 
   * @group Static Accessors
   */
  public static async allIDs (): Promise<string[]> {
    return await this.coordinator.allIDs();
  }

  /**
   * Returns number of Credential instances
   * 
   * @group Static Accessors
   */
  public static get size (): number {
    return this.coordinator.size;
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
  public static async store (token: Token, tags: string[] = []): Promise<Credential> {
    return await this.coordinator.store(token, tags);
  }

  /**
   * Returns {@link Credential} instance with corresponding {@link Credential.id | id}
   * 
   * @remarks
   * This method can be used to retreive a specific {@link Credential}, however its recommended to use
   * {@link Credential.getDefault} or {@link Credential.find} to query by {@link Credential.tags | tags} instead
   * 
   * @group Static Methods
   */
  public static async with (id: string): Promise<Credential | null> {
    return await this.coordinator.with(id);
  }

  /**
   * Returns all Credential instances where `matcher` function returns `true`
   * 
   * @param matcher - Function which takes `meta` as first argument. Returns `true` if Credential should
   * be included, `false` otherwise
   * 
   * *Shorthand* Pass an object with any key in {@link Token.Token.Metadata:TYPE | Token.Metadata} and a string value to match on.
   * 
   * @group Static Methods
   * 
   * @example
   * // find Credentials by tag 'foo'
   * Credential.find(meta => meta?.tags?.includes('foo'));
   * 
   * // shorthand - find Credentials by tag 'foo'
   * Credential.find({ tags: 'foo' });
   */
  public static async find (
    matcher: ((meta: Token.Metadata) => boolean) | { [key in keyof Token.Metadata]?: string | string[] }
  ): Promise< Credential[]> {
    if (typeof matcher !== 'function') {
      const target = { ...matcher };
      matcher = (meta: Token.Metadata) => {
        return Object.keys(target).every(key => {
          if (Array.isArray(target[key])) {
            // compare array to meta array
            if (Array.isArray(meta[key])) {
              // ensure every target value is included in meta array
              return target[key].every((val: string) => meta[key].includes(val));
            }
            // compare array to meta primitive
            else {
              throw new TypeError('Cannot compare array to primitive');
            }
          }
          else {
            // compare primitive to meta array
            if (Array.isArray(meta[key])) {
              return meta[key].includes(target[key]);
            }
          }

          // compare primitive to meta primitive
          return meta[key] === target[key];
        });
      };
    }

    return await this.coordinator.find(matcher);
  }

  /**
   * Removes all {@link Credential} instances and clears storage
   * 
   * @group Static Methods
   */
  public static async clear () {
    await this.coordinator.clear();
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
   * The {@link Token.Token | Token} instance {@link Credential} is associated with
   * 
   * @remarks
   * This value may change, from operations like {@link Credential.refresh},
   * however the {@link Token.Token.id | Token.id} will remain consistent
   */
  public get token (): Token {
    return this._token;
  }

  /** @internal */
  // confirms token ids match, then sets new token value
  protected set token (token: Token) {
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
  public async setTags (tags: string[] = []) {
    const metadata = Token.Metadata(this.token, tags);
    await this.coordinator.tokenStorage.setMetadata(metadata);
    this._metadata = metadata;
    Credential.emitter.emit('tags_updated', { id: this.id, tags });
  }

  /**
   * Removes {@link Credential} from storage
   * 
   * @remarks
   * **NOTE:** this method *does not* revoke tokens
   * 
   * @see {@link revoke | Credential.prototype.revoke}
   */
  public async remove () {
    return await this.coordinator.remove(this);
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
  public async authorize (input: string | URL | Request, init: RequestAuthorizerInit = {}) {
    return this.token.authorize(input, init);
  }

  // TODO: return metadata as well?
  public toJSON (): JsonRecord {
    return this.token.toJSON();
  }

  /** @internal */
  protected observeToken () {
    this.oauth2.emitter.on('token_did_refresh', ({ token }) => {
      if (Token.isEqual(token, this.token)) { return; }
      this.token = token;
    });

    // bind listener to Derived class instance
    this.coordinator.emitter.on('metadata_updated', async ({ id, metadata }) => {
      if (this.id === id) {
        Credential.emitter.emit('tags_updated', { id, tags: metadata?.tags ?? [] });
      }
    });
  }

  // oauth2 methods

  /**
   * Attempts to refresh the represented `token`
   * 
   * @remarks 
   * Upon successful refresh, the `token` will be replaced with a new
   * {@link Token.Token | Token} instance, however the `id` property will remain consistent
   * 
   * @group OAuth2 Methods
   * 
   * @throws {@link Core.OAuth2Error | OAuth2Error } if refresh fails
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
        this.coordinator.emitter.emit('credential_refreshed', { credential: this });
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
   * Expiration calculation is performed on the browser via `TimeCoordinator`
   * 
   * @group OAuth2 Methods
   * 
   * @throws {@link Core.OAuth2Error | OAuth2Error} if refresh fails
   */
  public async refreshIfNeeded (gracePeriod: Seconds = 30): Promise<void> {
    const timestamp = Timestamp.from(this.token.expiresAt);
    if (timestamp.timeSinceNow() <= gracePeriod) {
      await this.refresh();
    }
  }

  /**
   * Revokes either {@link Token.Token.accessToken | token.accessToken} or
   * {@link Token.Token.refreshToken | token.refreshToken} or both
   * 
   * @remarks
   * * If `RevokeType.ALL`, {@link Credential} will be removed
   * 
   * @group OAuth2 Methods
   *
   * @throws {@link Core.OAuth2Error | OAuth2Error} if revocation fails
   * 
   * @see
   * {@link https://developer.okta.com/docs/api/openapi/okta-oauth/oauth/tag/CustomAS/#tag/CustomAS/operation/revokeCustomAS | Okta Docs}
   * {@link https://oauth.net/2/token-revocation/ | OAuth2 Reference}
   * {@link https://datatracker.ietf.org/doc/html/rfc7009 | RFC}
   */
  public async revoke (type: Token.RevokeType = 'ALL') {
    const shouldRemove = type === 'ALL' ||
      (type === 'REFRESH' && this.token.refreshToken) ||
      (type === 'ACCESS' && !this.token.refreshToken);

    const error = await this.oauth2.revoke(this.token, type);

    if (isOAuth2ErrorResponse(error)) {
      throw new OAuth2Error(error);
    }

    if (shouldRemove) {
      this.remove();
    }
  }

  /**
   * Performs introspect on a specific token
   * 
   * @param kind - The specific token to introspect.
   * Must be available in {@link Credential.token}
   * 
   * @group OAuth2 Methods
   * 
   * @throws {@link Core.OAuth2Error | OAuth2Error}
   *
   * @see
   * {@link https://developer.okta.com/docs/api/openapi/okta-oauth/oauth/tag/CustomAS/#tag/CustomAS/operation/introspectCustomAS | Okta Docs}
   * {@link https://oauth.net/2/token-introspection/ | OAuth2 Reference}
   */
  public async introspect (kind: Token.Kind) {
    const response = await this.oauth2.introspect(this.token, kind);

    if (isOAuth2ErrorResponse(response)) {
      throw new OAuth2Error(response);
    }

    return response;
  }

  /**
   * Performs OIDC UserInfo request
   * 
   * @param ignoreCache - When `false` any previously fetched result will be returned rather than making a network request. Defaults to `false`
   *
   * @group OAuth2 Methods
   * 
   * @throws {@link Core.OAuth2Error | OAuth2Error}
   *
   * @see
   * {@link https://developer.okta.com/docs/api/openapi/okta-oauth/oauth/tag/CustomAS/#tag/CustomAS/operation/userinfoCustomAS | Okta Docs}
   * {@link https://openid.net/specs/openid-connect-core-1_0.html#UserInfo | OIDC Spec}
   */
  public async userInfo (ignoreCache: boolean = false) {
    if (!ignoreCache && this._userInfo) {
      return this._userInfo;
    }

    const response = await this.oauth2.userInfo(this.token);

    if (isOAuth2ErrorResponse(response)) {
      throw new OAuth2Error(response);
    }

    this._userInfo = response;    // caches userInfo value on Credential instance
    return response;
  }
}
