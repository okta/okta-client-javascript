/**
 * @module
 * @mergeModuleWith Core
 */


import type { JsonRecord, RawRepresentable, Expires, TimeInterval } from '../types/index.ts';
import { JWTError } from '../errors/index.ts';
import { validateString } from '../utils/validators.ts';
import { JWK, JWKS } from './JWK.ts';
import { buf, b64u } from '../crypto/index.ts';
import { IDTokenValidator } from './IDTokenValidator.ts';
import { Platform } from '../platform/Platform.ts';


/**
 * Defines registered `JWT` header parameters.
 * 
 * @group JWT
 * @interface
 * @useDeclaredType
 * @see
 * * {@link https://datatracker.ietf.org/doc/html/rfc7515#section-4.1 | RFC 7515 - Registered Header Parameter Names}
 * * {@link https://datatracker.ietf.org/doc/html/rfc7519#section-5 | RFC 7519 - JOSE Header}
 */
export interface JWTHeader {
  /**
   * Algorithm
   * @see {@link https://datatracker.ietf.org/doc/html/rfc7515#section-4.1.1 | RFC 7515 - "alg" (Algorithm) Header Parameter}
   */
  alg: string;
  /**
   * Key ID
   * @see {@link https://datatracker.ietf.org/doc/html/rfc7515#section-4.1.4 | RFC 7515 - "kid" (Key ID) Header Parameter}
   */
  kid?: string;
  /**
   * Type
   * @see {@link https://datatracker.ietf.org/doc/html/rfc7515#section-4.1.9 | RFC 7515 - "typ" (Type) Header Parameter}
   */
  typ?: string;
  /**
   * JWK Set URL
   * @see {@link https://datatracker.ietf.org/doc/html/rfc7515#section-4.1.2 | RFC 7515 - "jku" (JWK Set URL) Header Parameter}
   */
  jku?: string;
  /**
   * X.509 URL
   * @see {@link https://datatracker.ietf.org/doc/html/rfc7515#section-4.1.5 | RFC 7515 - "x5u" (X.509 URL) Header Parameter}
   */
  x5u?: string;
  /**
   * X.509 Certificate SHA-1 Thumbprint
   * @see {@link https://datatracker.ietf.org/doc/html/rfc7515#section-4.1.7 | RFC 7515 - "x5t" (X.509 Certificate SHA-1 Thumbprint) Header Parameter}
   */
  x5t?: string;
  /**
   * X.509 Certificate Chain
   * @see {@link https://datatracker.ietf.org/doc/html/rfc7515#section-4.1.6 | RFC 7515 - "x5c" (X.509 Certificate Chain) Header Parameter}
   */
  x5c?: string;
}

/**
 * Defines registered `JWT` claim names.
 *
 * @group JWT
 * @interface
 * @useDeclaredType
 * @see
 * * {@link https://datatracker.ietf.org/doc/html/rfc7519#section-4 | RFC 7519 - Registered Claim Names}
 */
export type JWTPayload = {
  /**
   * Audience
   * @see {@link https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.3 | RFC 7519 - "aud" (Audience) Claim}
   */
  aud?: string;
  /**
   * Issuer
   * @see {@link https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.1 | RFC 7519 - "iss" (Issuer) Claim}
   */
  iss?: string;
  /**
   * Subject
   * @see {@link https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.2 | RFC 7519 - "sub" (Subject) Claim}
   */
  sub?: string;
  /**
   * Expiration Time
   * @see {@link https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.4 | RFC 7519 - "exp" (Expiration Time) Claim}
   */
  exp?: number;
  /**
   * Issued At
   * @see {@link https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.6 | RFC 7519 - "iat" (Issued At) Claim}
   */
  iat?: number;
  /**
   * Not Before
   * @see {@link https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.5 | RFC 7519 - "nbf" (Not Before) Claim}
   */
  nbf?: number;
  /**
   * JWT ID
   * @see {@link https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.7 | RFC 7519 - "jti" (JWT ID) Claim}
   */
  jti?: string;
  /**
   * Scopes
   * @see {@link https://datatracker.ietf.org/doc/html/rfc8693#section-4.2 | RFC 8693 - "scope" (Scopes) Claim}
   */
  scp?: string[];
  /**
   * Authentication Context Class Reference
   * @see {@link https://openid.net/specs/openid-connect-core-1_0.html#IDToken | OIDC Core - ID Token}
   */
  acr?: string;
  /**
   * Access Token hash value
   * @see {@link https://openid.net/specs/openid-connect-core-1_0.html#CodeIDToken | OIDC Core - "at_hash" Claim}
   */
  at_hash?: string;
} & JsonRecord


function validateHeader (header: JsonRecord) {
  if (!validateString(header.alg)) {
    throw new JWTError('Missing `alg` claim');
  }
}

function validateBody (claims: JsonRecord) {
  if (claims.exp) {
    if (typeof claims.exp !== 'number') {
      throw new JWTError('Unexpected `exp` claim type');
    }
  }

  if (claims.iat) {
    if (typeof claims.iat !== 'number') {
      throw new JWTError('Unexpected `iat` claim type');
    }

    // .exp is asserted to be a number above, TS can't keep up
    if (claims.iat > (claims.exp as number)) {
      throw new JWTError('`iat` claim cannot be sooner than `exp` claim');
    }
  }

  if (claims.nbf) {
    if (typeof claims.nbf !== 'number') {
      throw new JWTError('Unexpected `nbf` claim type');
    }

    if (!Platform.TimeCoordinator.now().isAfter(claims.nbf)) {
      throw new JWTError('`nbf` claim is unexpectedly in the past');
    }
  }

  if (claims.iss) {
    if (typeof claims.iss !== 'string') {
      throw new JWTError('Unexpected `iss` claim type');
    }
  }

  if (claims.aud) {
    // throw if not a string or array
    if (typeof claims.aud !== 'string' && !Array.isArray(claims.aud)) {
      throw new JWTError('Unexpected `aud` claim type');
    }
  }
}

function parseJWTComponent (component: string) {
  try {
    const parsedComponent = JSON.parse(buf(b64u(component)));
    return parsedComponent;
  }
  catch (err) {
    throw new JWTError('Unable to parse JWT component');
  }
}

/**
 * A class representation of a `JWT`
 * 
 * @group JWT
 * 
 * @see
 * * {@link https://datatracker.ietf.org/doc/html/rfc7519 | RFC 7519 - JSON Web Token (JWT)}
 * * {@link https://datatracker.ietf.org/doc/html/rfc7515 | RFC 7515 - JSON Web Signature (JWS)}
 * * {@link https://datatracker.ietf.org/doc/html/rfc7517 | RFC 7517 - JSON Web Key (JWK)}
 */
export class JWT implements RawRepresentable, Expires {
  #jwt: string;
  #claims: JWTPayload;
  #header: JWTHeader;

  constructor (jwtStr: string) {
    if (!validateString(jwtStr)) {
      throw new JWTError('`jwtString` must be an non-empty string');
    }
    this.#jwt = jwtStr;

    const { 0: head, 1: body, length } = jwtStr.split('.');
  
    // https://github.com/okta/okta-mobile-swift/blob/master/Sources/AuthFoundation/JWT/JWT.swift#L92
    if (length !== 3) {
      throw new JWTError('Bad jwt structure');
    }

    const header = parseJWTComponent(head);
    // ensures `alg` is defined
    validateHeader(header);
    this.#header = header as JWTHeader;

    const claims = parseJWTComponent(body);
    // verifies types of common jwt claims: iss, aud, iat, nbf, etc
    validateBody(claims);
    this.#claims = claims as JWTPayload;
  }

  /**
   * Writes and signs a {@link JWT} as a `string`.
   * @group Static Methods
   */
  static async write (
    header: JWTHeader,
    claims: JsonRecord,
    signingKey: CryptoKey
  ): Promise<string> {
    const head = b64u(buf(JSON.stringify(header)));
    const body = b64u(buf(JSON.stringify(claims)));
    const signature = await crypto.subtle.sign(
      { name: signingKey.algorithm.name }, signingKey, buf(`${head}.${body}`)
    );
    return `${head}.${body}.${b64u(signature)}`;
  }

  get header (): JWTHeader {
    return this.#header;
  }

  // TODO: claims vs payload
  get claims (): JWTPayload {
    return this.#claims;
  }
  get payload (): JWTPayload {
    return this.#claims;
  }

  // RawRepresentable
  /**
   * @remarks
   * `RawRepresentable`
   * @returns stringified representation of the {@link JWT}
   */
  get rawValue (): string {
    return this.#jwt;
  }

  // Common jwt claim "shortcuts"
  /**
   * Alias for `JWT.claims.aud`.
   * @group JWT Claim accessor
   * @see {@link https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.3 | RFC 7519 - "aud" (Audience) Claim}
   */
  get audience (): string | undefined {
    return this.#claims.aud;
  }
  /**
   * Alias for `JWT.claims.exp`, converted to a {@link !Date}.
   * @group JWT Claim accessor
   * @see {@link https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.4 | RFC 7519 - "exp" (Expiration Time) Claim}
   */
  get expirationTime (): Date | undefined {
    return this.#claims?.exp ? new Date(this.#claims.exp * 1000) : undefined;
  }
  /**
   * Alias for `JWT.claims.exp`.
   * @group JWT Claim accessor
   * @see {@link https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.4 | RFC 7519 - "exp" (Expiration Time) Claim}
   */
  get expiresIn (): TimeInterval {
    // TODO: fix this
    return this.#claims.exp ?? 0;
  }
  /**
   * Alias for `JWT.claims.iss`.
   * @group JWT Claim accessor
   * @see {@link https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.1 | RFC 7519 - "iss" (Issuer) Claim}
   */
  get issuer (): string | undefined {
    return this.#claims.iss;
  }
  /**
   * Alias for `JWT.claims.iat`, converted to a {@link !Date}.
   * @group JWT Claim accessor
   * @see {@link https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.6 | RFC 7519 - "iat" (Issued At) Claim}
   */
  get issuedAt (): Date | undefined {
    return this.#claims?.iat ? new Date(this.#claims.iat * 1000) : undefined;
  }
  /**
   * Alias for `JWT.claims.nbf`, converted to a {@link !Date}.
   * @group JWT Claim accessor
   * @see {@link https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.5 | RFC 7519 - "nbf" (Not Before) Claim}
   */
  get notBefore (): Date | undefined {
    return this.#claims?.nbf ? new Date(this.#claims.nbf * 1000) : undefined;
  }
  /**
   * Alias for `JWT.claims.scp` and `JWT.scopes`.
   * @group JWT Claim accessor
   * @see {@link https://datatracker.ietf.org/doc/html/rfc8693#section-4.2 | RFC 8693 - "scope" (Scopes) Claim}
   */
  get scope (): string[] | undefined {
    return this.#claims.scp;
  }
  /**
   * Alias for `JWT.claims.scp` and `JWT.scope`.
   * @group JWT Claim accessor
   * @see {@link https://datatracker.ietf.org/doc/html/rfc8693#section-4.2 | RFC 8693 - "scope" (Scopes) Claim}
   */
  get scopes (): string[] | undefined {
    return this.#claims.scp;
  }
  /**
   * Alias for `JWT.claims.sub`.
   * @group JWT Claim accessor
   * @see {@link https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.2 | RFC 7519 - "sub" (Subject) Claim}
   */
  get subject (): string | undefined {
    return this.#claims.sub;
  }

  // Expires
  /**
   * Alias for `JWT.expirationTime`.
   * @group JWT Claim accessor
   */
  get expiresAt (): Date | undefined {
    return this.expirationTime;
  }
  /**
   * Compares the current time with the {@link JWT.expirationTime}.
   * 
   * @see {@link Platform.TimeCoordinator}
   */
  get isExpired (): boolean {
    if (!this.expirationTime) {
      return false;
    }
    const now = Platform.TimeCoordinator.now();
    return now.isBefore(this.expirationTime);
  }
  /**
   * Returns `true`, if the token is not expired, compared to the {@link JWT.expirationTime}
   */
  get isValid(): boolean {
    return !this.isExpired;
  }

  // TODO:
  // hasClaim (claim: string): boolean {
  //   return claim in this.claims;
  // }

  /**
   * Alias for {@link JWT.validate}.
   */
  async verifySignature (keySet: JWKS): Promise<boolean> {
    return JWK.validator.validate(this, keySet);
  }

  /**
   * 
   */
  async validate (keySet: JWKS): Promise<boolean> {
    return this.verifySignature(keySet);
  }

  // TODO: fix this
  toJSON () {
    return { rawValue: this.#jwt };
  }

  toString () {
    return this.#jwt;
  }
}

/**
 * @group JWT
 * @internal
 */
export type JWTValidator = IDTokenValidator;
