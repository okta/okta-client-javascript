import {
  type GrantType,
  type Codable,
  type Expires,
  type TokenType,
  type RequestAuthorizer,
  isOAuth2ErrorResponse,
} from './types';
import type { OAuth2Client } from './oauth2/client';
import { OAuth2Error } from './errors';
import { validateURL } from './validators';
import { mCodable } from './mixins/Codable';
import { shortID } from './crypto';
import { JWT } from './jwt';
import { OAuth2Request } from './http';
import TimeCoordinator from './utils/TimeCoordinator';

/**
 * @module Token
 */

/**
 * Object representation of a token response
 * @group Token
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
 * JSON representation of token
 * @group Token
 */
export type TokenJSON = Omit<TokenResponse, 'idToken'> & {
  idToken?: string | JWT;
  context: Token.Context;
};

/** @ignore */
const TokenImpl = mCodable(class {
  /** @internal */
  public static expiryTimeouts: {[key: string]: NodeJS.Timeout} = {};

  public readonly id: string;
  public readonly issuedAt: Date;

  // TODO: enum?
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
  public readonly scope: string | undefined;

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
  constructor (obj: TokenJSON) {
    const id = obj?.id ?? shortID();
    this.id = id;
    this.issuedAt = obj?.issuedAt ? new Date(obj?.issuedAt) : TimeCoordinator.now().asDate;

    this.accessToken = obj.accessToken;
    if (obj.idToken) {
      this.idToken = obj.idToken instanceof JWT ? obj.idToken : new JWT(obj.idToken);
    }
    this.refreshToken = obj?.refreshToken;

    this.tokenType = obj.tokenType;
    this.expiresIn = obj.expiresIn;
    this.scope = Array.isArray(obj.scopes) ? obj.scopes.join(' ') : obj.scopes;
    this.context = obj.context;
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

  public static async from (refreshToken: string, client: OAuth2Client): Promise<Token> {
    const openIdConfiguration = await client.openIdConfiguration();

    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    const request = new Token.RefreshRequest({
      openIdConfiguration,
      clientConfiguration: client.configuration,
      refreshToken
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
   * Compares `this.expiresAt` against {@link TimeCoordinator} to determine if Token is expired
   * @public
   */
  get isExpired (): boolean {
    // TODO: revisit
    const now = TimeCoordinator.now().asDate;
    return +this.expiresAt - +now <= 0;
  }

  /**
   * Returns `true` if the {@link Token} is _not_ expired
   * 
   * @see {@link Token.isExpired}
   */
  get isValid (): boolean {
    return !this.isExpired;
  }

  /**
   * Returns the OAuth2 `scope`(s) used to issue the token
   */
  get scopes (): string[] {
    return this.scope?.split(' ') ?? [];
  }


  /**
   * Converts a {@link Token} instance to an serializable object literal representation
   */
  toJSON (): TokenJSON {
    const {
      tokenType,
      expiresIn,
      issuedAt,
      scope,
      accessToken,
      context
    } = this;

    const value: TokenJSON = {
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
   * Used to merge separate {@link Token} instances together. Useful when handling token refresh as
   * not every value is returned in a refresh request compared to the initial token request
   * 
   * @param token the "old" token instance to be merged into the "new" token
   * @returns new {@link Token} instance
   */
  merge (token: Token): Token {
    // TODO: add deviceSecret at some point (ref: Token+Internal.swift)
    // Note: awkward because placeholder
    if (!(!this.refreshToken && !!token.refreshToken)) {
      return this as unknown as Token;    // casting required due to mixin pattern (ugh)
    }

    // mixin pattern confuses eslint. Disabling rule
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    return new Token({
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
   * TODO: add dpop support (method is async for this purpose)
   */
  async authorize (input: string | URL | Request, init?: RequestInit): Promise<Request> {
    const request = input instanceof Request ? input : new Request(input, init);
    request.headers.append('Authorization', `Bearer ${this.accessToken}`);
    return request;
  }

});

/**
 * Internal representation of a OAuth2/OIDC Token.
 * Contains `accessToken`, conditionally contains `idToken` and `refreshToken`
 * 
 * @group Token
 * 
 * @remarks
 * Most operations can be done by {@link Credential} methods. It's recommended
 * to use those instead before reaching for a {@link Token} method
 * 
 * @see
 * - Okta Documentation: {@link https://developer.okta.com/docs/reference/api/oidc/#response-properties-4 | OIDC }
 */
export class Token extends TokenImpl implements Codable, Expires, RequestAuthorizer {}


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
    scopes: string;
    dpopPairId?: string;
  };

  /**
   * Non-sensitive metadata values used to query storage for specific tokens
   */
  export type Metadata = {
    id: string;
    tags: string[];
    scopes: string[];
    payload: string;
  };

  export function Metadata (token: Token, tags: string[] = []): Metadata {
    const metadata = {
      id: token.id,
      tags,
      scopes: token.scopes,
      payload: '{}'
    };

    if (token.idToken) {
      metadata.payload = JSON.stringify(token.idToken.payload);
    }

    return metadata;
  }

  /** @internal */
  export interface TokenRequestParams extends OAuth2Request.RequestParams {
    grantType: GrantType;
  }

  /** @internal */
  export class TokenRequest extends OAuth2Request {
    grantType: GrantType;

    constructor (params: TokenRequestParams) {
      const { openIdConfiguration, clientConfiguration } = params;
      super({ openIdConfiguration, clientConfiguration });
      this.grantType = params.grantType;

      this.headers.set('accept', 'application/json');
      this.headers.set('content-type', 'application/x-www-form-urlencoded;charset=UTF-8');
      this.body.set('client_id', this.clientConfiguration.clientId);
      this.body.set('grant_type', this.grantType);
    }

    request (): Request {
      if (!validateURL(this.openIdConfiguration?.token_endpoint)) {
        throw new OAuth2Error('missing `token_endpoint`');
      }

      // validateURL ensures .token_endpoint exists and is a valid URL
      const url = new URL(this.openIdConfiguration.token_endpoint!);

      return new Request(url, {
        method: 'POST',
        body: this.body,
        headers: this.headers
      });
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
    scope: string;
    refreshToken: string;

    constructor (params: RefreshRequestParams) {
      const { openIdConfiguration, clientConfiguration } = params;
      super({ openIdConfiguration, clientConfiguration, grantType: 'refresh_token' });
      this.id = params.id;
      this.scope = params.scope ?? clientConfiguration.scopes;
      this.refreshToken = params.refreshToken;

      this.body.set('scope', this.scope);
      this.body.set('refresh_token', this.refreshToken);
    }
  }

  // TODO: add DeviceSecret
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

    request (): Request {
      if (!validateURL(this.openIdConfiguration?.revocation_endpoint)) {
        throw new OAuth2Error('missing `revocation_endpoint`');
      }
      // validateURL ensures .revocation_endpoint exists and is a valid URL
      const url = new URL(this.openIdConfiguration.revocation_endpoint!);

      return new Request(url, {
        method: 'POST',
        body: this.body,
        headers: this.headers
      });
    }
  }
}
