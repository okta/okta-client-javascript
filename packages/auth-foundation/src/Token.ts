import {
  type GrantType,
  type Expires,
  type TokenType,
  type RequestAuthorizer,
  type RequestAuthorizerInit,
  type Seconds,
  type JSONSerializable,
  type AcrValues,
  isOAuth2ErrorResponse,
  JsonPrimitive,
  JsonRecord,
} from './types/index.ts';
import type { OAuth2Client } from './oauth2/client.ts';
import { OAuth2Error } from './errors/index.ts';
import { validateURL } from './internals/validators.ts';
import { shortID } from './crypto/index.ts';
import { JWT } from './jwt/index.ts';
import { OAuth2Request } from './http/index.ts';
import { DefaultDPoPSigningAuthority, DPoPSigningAuthority } from './oauth2/dpop/index.ts';
import { Timestamp } from './utils/TimeCoordinator.ts';
import TimeCoordinator from './utils/TimeCoordinator.ts';

/**
 * @module Token
 */

/**
 * Object representation of a token response
 * @group Types
 */
export type TokenResponse = {
  id?: string;
  tokenType: TokenType;
  expiresIn: number;
  issuedAt?: number;
  scopes?: string | string[];
  accessToken: string;
  idToken?: string;
  refreshToken?: string;
  context: Token.Context;
};

/**
 * Required and optional values to construct a {@link Token} instance
 * @group Types
 */
export type TokenInit = Omit<TokenResponse, 'idToken'> & {
  idToken?: string | JWT;
};

/**
 * JSON representation of token (only contains primitive types)
 * @group Types
 */
export type TokenPrimitiveInit = TokenResponse;

/**
 * Internal representation of a OAuth2/OIDC Token.
 * Contains `accessToken`, conditionally contains `idToken` and `refreshToken`
 *
 * @group Token
 *
 * @remarks
 * Most operations can be done by {@link Credential} methods. It's recommended
 * to use those instead before reaching for a {@link Token.Token | Token} method
 *
 * @see
 * - Okta Documentation: {@link https://developer.okta.com/docs/reference/api/oidc/#response-properties-4 | OIDC }
 */
export class Token implements JSONSerializable, Expires, RequestAuthorizer {
  public readonly dpopSigningAuthority: DPoPSigningAuthority = DefaultDPoPSigningAuthority;

  /** @internal */
  public static expiryTimeouts: {[key: string]: ReturnType<typeof setTimeout>} = {};

  public readonly id: string;
  public readonly issuedAt: Date;

  /** 
   * The audience of the token. ex `Bearer` or `DPoP`
   */
  public readonly tokenType: TokenType;
  /**
   * Seconds until token expires
   */
  public readonly expiresIn: number;
  /** 
   * OAuth2 / OIDC scopes associated with token
   */
  public readonly scope: string = '';

  /**
   * String value of `accessToken`
   */
  public readonly accessToken: string;
  /**
   * If the OAuth2 configuration includes OIDC, an `idToken` will be available
   */
  public readonly idToken?: JWT;
  /**
   * If the OAuth2 configuration includes the scope `offline_access`, a `refreshToken` will be available
   */
  public readonly refreshToken?: string;
  /**
   * Defines the context this token was issued from
   */
  public readonly context: Token.Context;

  /**
   * The constructor of Token
   */
  constructor (obj: TokenInit) {
    const id = obj?.id ?? shortID();
    this.id = id;
    this.issuedAt = obj?.issuedAt ? new Date(obj?.issuedAt) : TimeCoordinator.now().asDate;

    this.accessToken = obj.accessToken;
    if (obj.idToken) {
      this.idToken = obj.idToken instanceof JWT ? obj.idToken : new JWT(obj.idToken);
    }
    if (obj.refreshToken) {
      this.refreshToken = obj.refreshToken;
    }

    if (obj.scopes) {
      this.scope = Array.isArray(obj.scopes) ? obj.scopes.join(' ') : obj.scopes;
    }

    this.tokenType = obj.tokenType;
    this.expiresIn = obj.expiresIn;
    this.context = obj.context ?? {};

    if (!this.context?.scopes || !Array.isArray(this.context.scopes)) {
      this.context.scopes = [...this.scopes];
    }
  }

  /**
   * @internal
   *
   * A static method (within this Base class) used to return instances of Derived classes
   * References:
   * - https://stackoverflow.com/questions/68672717/create-instance-of-derived-class-from-base-class-with-generic-types
   * - https://stackoverflow.com/questions/60199917/in-typescript-how-to-return-sub-class-instance-in-a-static-function-in-base-cla
   */
  // idk man, typescript...
  protected static create<T extends Token>(this: new (init: TokenInit) => T, init: TokenInit): T {
    return new this(init);
  }

  public static serializer (t: object): string {
    return JSON.stringify(t);
  }

  public static isEqual (lhs: Token, rhs: Token) {
    return (
      // lhs.context == rhs.context
      lhs.accessToken === rhs.accessToken &&
      lhs.refreshToken === rhs.refreshToken &&
      lhs.scope === rhs.scope &&
      lhs.idToken?.rawValue === rhs.idToken?.rawValue
      // && lhs.deviceSecet === rhs.deviceSecret
    );
  }

  // TODO: consider with method with DPOP
  public static async from (refreshToken: string, client: OAuth2Client): Promise<Token> {
    const openIdConfiguration = await client.openIdConfiguration();

    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    const request = new Token.RefreshRequest({
      openIdConfiguration,
      clientConfiguration: client.configuration,
      refreshToken,
      scope: client.configuration.scopes
    });

    const response = await client.exchange(request);

    if (isOAuth2ErrorResponse(response)) {
      throw new OAuth2Error(response);
    }

    return response;
  }

  /**
   * When the Token will expire, represented as a `Date`
   * @public
   */
  get expiresAt (): Date {
    return new Date(this.issuedAt.valueOf() + (this.expiresIn * 1000));
  }

  /**
   * Compares `this.expiresAt` against `TimeCoordinator` to determine if Token is expired
   * @public
   */
  get isExpired (): boolean {
    // TODO: revisit
    const now = TimeCoordinator.now().asDate;
    return +this.expiresAt - +now <= 0;
  }

  /**
   * Returns `true` if the {@link Token.Token | Token} is _not_ expired
   * 
   * @see {@link Token.isExpired}
   */
  get isValid (): boolean {
    return !this.isExpired;
  }

  /**
   * Returns `true` if the {@link Token.Token | Token} will expire after a duration (seconds)
   *
   * @see {@link Token.willBeValidIn}
   */
  willBeExpiredIn (duration: Seconds) {
    const ts = Timestamp.from(TimeCoordinator.now().value + duration);
    return ts.isAfter(this.expiresAt);
  }

  /**
   * Returns `true` if the {@link Token.Token | Token} will _not_ expire after a duration (seconds)
   *
   * @see {@link Token.willBeExpiredIn}
   */
  willBeValidIn (duration: Seconds) {
    return !this.willBeExpiredIn(duration);
  }

  /**
   * Returns the OAuth2 `scope`(s) used to issue the token
   */
  get scopes (): string[] {
    const scope = this.scope === '' ? undefined : this.scope;
    return scope?.split(' ') ?? [];
  }

  /**
   * Converts a {@link Token.Token | Token} instance to an serializable object literal representation
   */
  toJSON (): JsonRecord {
    const {
      tokenType,
      expiresIn,
      issuedAt,
      scope,
      accessToken,
      context
    } = this;

    const value: JsonRecord = {
      tokenType,
      expiresIn,
      issuedAt: issuedAt.valueOf(),
      scopes: scope,
      accessToken,
      context
    };

    if (this?.idToken) {
      value.idToken = this.idToken.rawValue;
    }

    if (this?.refreshToken) {
      value.refreshToken = this.refreshToken;
    }

    return value;
  }

  /**
   * Used to merge separate {@link Token.Token | Token} instances together. Useful when handling token refresh as
   * not every value is returned in a refresh request compared to the initial token request
   * 
   * @param token the "old" token instance to be merged into the "new" token
   * @returns new {@link Token.Token | Token} instance
   */
  merge (token: Token): Token {
    // TODO: add deviceSecret at some point (ref: Token+Internal.swift)
    // Note: awkward because placeholder
    if (!(!this.refreshToken && !!token.refreshToken)) {
      return this as unknown as Token;    // casting required due to mixin pattern (ugh)
    }

    return Token.create({
      id: this.id,
      issuedAt: (this.issuedAt ?? token.issuedAt ?? TimeCoordinator.now().asDate).valueOf() / 1000,
      tokenType: this.tokenType,
      expiresIn: this.expiresIn,
      accessToken: this.accessToken,
      scopes: this.scope,
      refreshToken: this.refreshToken ?? token.refreshToken,
      idToken: this.idToken,
      // deviceSecret: this.deviceSecret ?? token.deviceSecret
      context: this.context
    });
  }

  serialize (): string {
    // mixin pattern confuses eslint. Disabling rule
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    return Token.serializer(this.toJSON());
  }

  /**
   * Signs a outgoing {@link https://developer.mozilla.org/en-US/docs/Web/API/Request | Request} with an `Authorization` header.
   * Accepts the same method signature as {@link https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch | fetch}
   * @returns {@link https://developer.mozilla.org/en-US/docs/Web/API/Request | Request} wrapped in a `Promise`
   *
   */
  async authorize (input: string | URL | Request, init: RequestAuthorizerInit = {}): Promise<Request> {
    const { dpopNonce, ...fetchInit } = init;
    const request = input instanceof Request ? input : new Request(input, fetchInit);

    if (this.tokenType === 'DPoP') {
      const keyPairId = this.context.dpopPairId;
      // .generateDPoPProof() will throw if dpopPairId is undefined
      await this.dpopSigningAuthority.sign(request, { keyPairId, nonce: dpopNonce, accessToken: this.accessToken });
    }

    request.headers.set('Authorization', `${this.tokenType} ${this.accessToken}`);

    return request;
  }

}


/**
 * @group Token
 */
export namespace Token {
  /**
   * Context used to request the token
   */
  export type Context = {
    issuer: string;
    clientId: string;
    scopes: string[];
    dpopPairId?: string;
    acrValues?: AcrValues;
  };

  // https://stackoverflow.com/a/54308812
  // A clever way of utilizing TS to ensure this array contains all keys of `Context`
  const ContextKeys = Object.keys({
    issuer: undefined,
    clientId: undefined,
    scopes: undefined,
    dpopPairId: undefined,
    acrValues: undefined,
  } satisfies Record<(keyof Context), undefined>) as (keyof Context)[];

  /**
   * Utility function for extracting {@link Token.Context} from an union-type object like {@link Token.Metadata:TYPE | Token.Metadata}
   */
  export function extractContext (input: { [key: string]: unknown }): Token.Context {
    const context = {};
    for (const key of ContextKeys) {
      if (input[key] !== undefined) {
        context[key] = input[key];
      }
    }

    return context as Token.Context;
  }

  /**
   * Non-sensitive metadata values associated with a {@link Token.Token | Token}. Used to store {@link Token.Context} and additional
   * metadata for a given {@link Token.Token | Token}
   * {@label TYPE}
   */
  export type Metadata = Context & {
    id: string;
    tags: string[];
    claims?: JsonRecord;
  };

  export function Metadata (token: Token, tags: string[] = []): Metadata {
    const metadata: Token.Metadata = {
      ...token.context,
      id: token.id,
      tags,
      scopes: token.scopes,
    };

    if (token.idToken) {
      metadata.claims = { ...token.idToken.payload };
    }

    return metadata;
  }

  /** @internal */
  export interface TokenRequestParams extends OAuth2Request.RequestParams {
    grantType: GrantType;
    acrValues?: AcrValues;
  }

  /** @internal */
  export class TokenRequest extends OAuth2Request {
    grantType: GrantType;
    acrValues?: AcrValues;

    constructor (params: TokenRequestParams) {
      const { openIdConfiguration, clientConfiguration } = params;
      super({ openIdConfiguration, clientConfiguration });
      this.grantType = params.grantType;
      this.acrValues = params.acrValues;

      this.headers.set('accept', 'application/json');
      this.headers.set('content-type', 'application/x-www-form-urlencoded;charset=UTF-8');
      this.body.set('client_id', this.clientConfiguration.clientId);
      this.body.set('grant_type', this.grantType);
    }

    get url (): string {
      if (!validateURL(this.openIdConfiguration?.token_endpoint, this.clientConfiguration.allowHTTP)) {
        throw new OAuth2Error('missing `token_endpoint`');
      }

      return this.openIdConfiguration.token_endpoint!;
    }
  }

  /** @internal */
  export interface RefreshRequestParams extends Omit<Token.TokenRequestParams, 'grantType'> {
    id?: string;
    scope?: string;
    refreshToken: string;
  }

  /** @internal */
  export class RefreshRequest extends Token.TokenRequest {
    id?: string;
    scope?: string;
    refreshToken: string;

    constructor (params: RefreshRequestParams) {
      const { openIdConfiguration, clientConfiguration } = params;
      super({ openIdConfiguration, clientConfiguration, grantType: 'refresh_token' });
      this.id = params.id;
      this.scope = params.scope;
      this.refreshToken = params.refreshToken;

      if (this.scope) {
        this.body.set('scope', this.scope);
      }
      this.body.set('refresh_token', this.refreshToken);
    }
  }


  /**
   * Possible values provided to {@link OAuth2.OAuth2Client.revoke | OAuth2Client.revoke} to determine which tokens to revoke
   */
  export type RevokeType = 'ALL' | 'ACCESS' | 'REFRESH';

  /** @internal */
  export interface RevokeRequestParams extends OAuth2Request.RequestParams {
    token: string;
    hint: 'access_token' | 'refresh_token';
  }

  /** @internal */
  export class RevokeRequest extends OAuth2Request {
    constructor (params: RevokeRequestParams) {
      const { openIdConfiguration, clientConfiguration } = params;
      super({ openIdConfiguration, clientConfiguration });

      this.headers.set('content-type', 'application/x-www-form-urlencoded;charset=UTF-8');
      this.headers.set('authorization', `Basic ${ btoa(this.clientConfiguration.clientId) }`);
      this.body.set('token', params.token);
      this.body.set('token_type_hint', params.hint);
    }

    get url (): string {
      if (!validateURL(this.openIdConfiguration?.revocation_endpoint, this.clientConfiguration.allowHTTP)) {
        throw new OAuth2Error('missing `revocation_endpoint`');
      }

      return this.openIdConfiguration.revocation_endpoint!;
    }
  }

  /**
   * Possible values provided to {@link OAuth2.OAuth2Client.introspect | OAuth2Client.introspect} to determine which token to introspect
   */
  export type Kind = 'access_token' | 'refresh_token' | 'id_token';

  /** @internal */
  export interface IntrospectRequestParams extends OAuth2Request.RequestParams {
    token: Token;
    type: Token.Kind;
  }

  /** @internal */
  export class IntrospectRequest extends OAuth2Request {
    constructor (params: IntrospectRequestParams) {
      const { openIdConfiguration, clientConfiguration, token } = params;
      super({ openIdConfiguration, clientConfiguration });

      this.headers.set('content-type', 'application/x-www-form-urlencoded;charset=UTF-8');
      this.headers.set('authorization', `Basic ${ btoa(this.clientConfiguration.clientId) }`);
      this.body.set('token_type_hint', params.type);

      if (params.type === 'access_token') {
        this.body.set('token', token.accessToken);
      }
      else if (token.refreshToken && params.type === 'refresh_token') {
        this.body.set('token', token.refreshToken);
      }
      else if (token.idToken && params.type === 'id_token') {
        this.body.set('token', token.idToken.rawValue);
      }
    }

    get url (): string {
      if (!this.body.get('token')) {
        throw new OAuth2Error('No token available for introspection');
      }

      if (!validateURL(this.openIdConfiguration?.introspection_endpoint, this.clientConfiguration.allowHTTP)) {
        throw new OAuth2Error('missing `introspection_endpoint`');
      }

      return this.openIdConfiguration.introspection_endpoint!;
    }
  }

  /**
   * Payload structure of a `/introspect` response
   */
  export type IntrospectResponse = {
    active: boolean,
    [key: string]: JsonPrimitive
  };
}
