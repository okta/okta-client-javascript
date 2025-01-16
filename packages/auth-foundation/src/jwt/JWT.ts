import type { JsonRecord, RawRepresentable, Expires, TimeInterval } from '../types';
import { JWTError } from '../errors';
import { validateString } from '../internals/validators';
import TimeCoordinator from '../utils/TimeCoordinator';
import { JWK, JWKS } from './JWK';
import { buf, b64u } from '../crypto';
import { IDTokenValidator } from './IDTokenValidator';

/**
 * @group JWT & Token Verification
 */
export interface JWTHeader {
  alg: string;
  kid?: string;
  typ?: string;
  // jku?: string;
  // x5u?: string;
  // x5t?: string;
}

type JWTPayload = {
  aud?: string;
  iss?: string;
  sub?: string;
  exp?: number;
  iat?: number;
  nbf?: number;
  jti?: string;
  scp?: string[];
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

    if (!TimeCoordinator.now().isAfter(claims.nbf)) {
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
 * @group JWT & Token Verification
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
   * @returns stringified representation of the JWT
   */
  get rawValue (): string {
    return this.#jwt;
  }

  // Common jwt claim "shortcuts"
  /**
   * @group JWT Claim accessor
   */
  get audience (): string | undefined {
    return this.#claims.aud;
  }
  /**
   * @group JWT Claim accessor
   */
  get expirationTime (): Date | undefined {
    return this.#claims?.exp ? new Date(this.#claims.exp * 1000) : undefined;
  }
  /**
   * @group JWT Claim accessor
   */
  get expiresIn (): TimeInterval {
    // TODO: fix this
    return this.#claims.exp ?? 0;
  }
  /**
   * @group JWT Claim accessor
   */
  get issuer (): string | undefined {
    return this.#claims.iss;
  }
  /**
   * @group JWT Claim accessor
   */
  get issuedAt (): Date | undefined {
    return this.#claims?.iat ? new Date(this.#claims.iat * 1000) : undefined;
  }
  /**
   * @group JWT Claim accessor
   */
  get notBefore (): Date | undefined {
    return this.#claims?.nbf ? new Date(this.#claims.nbf * 1000) : undefined;
  }
  /**
   * @group JWT Claim accessor
   */
  get scope (): string[] | undefined {
    return this.#claims.scp;
  }
  /**
   * @group JWT Claim accessor
   */
  get scopes (): string[] | undefined {
    return this.#claims.scp;
  }
  /**
   * @group JWT Claim accessor
   */
  get subject (): string | undefined {
    return this.#claims.sub;
  }

  // Expires
  /**
   * @group JWT Claim accessor
   */
  get expiresAt (): Date | undefined {
    return this.expirationTime;
  }
  get isExpired (): boolean {
    if (!this.expirationTime) {
      return false;
    }
    const now = TimeCoordinator.now();
    return now.isBefore(this.expirationTime);
  }
  get isValid(): boolean {
    return !this.isExpired;
  }

  // TODO:
  // hasClaim (claim: string): boolean {
  //   return claim in this.claims;
  // }

  // TODO: how can this be overwritten?
  async verifySignature (keySet: JWKS): Promise<boolean> {
    return JWK.validator.validate(this, keySet);
  }
  // parity
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

export type JWTValidator = IDTokenValidator;
