/* eslint max-depth: [2, 4] */
/**
 * @module
 * @mergeModuleWith Core
 */


import type { AcrValues } from '../types/index.ts';
import type { JWT } from './JWT.ts';
import { JWTError } from '../errors/index.ts';
import TimeCoordinator, { Timestamp } from '../utils/TimeCoordinator.ts';

/**
 * @group JWT
 */
export interface IDTokenValidatorContext {
  nonce?: string;
  maxAge?: number;
  acrValues?: AcrValues;
  supportedAlgs?: string[];
}

/**
 * @group JWT
 */
export interface IDTokenValidator {
  issuedAtGraceInterval: number;
  checks: IDTokenValidator.ValidationCheck[];

  validate: (token: JWT, issuer: URL, clientId: string, context?: IDTokenValidatorContext) => void;
}

/**
 * @group JWT
 *
 * @remarks
 * https://openid.net/specs/openid-connect-core-1_0-final.html#IDToken
 */
export namespace IDTokenValidator {

  /**
   * A list of validition checks which will be performed to validate a {@link JWT}
   */
  // ref: https://stackoverflow.com/questions/44480644/string-union-to-string-array
  export const allValidationChecks = [
    'issuer', 'audience', 'scheme', 'algorithm', 'expirationTime', 'issuedAtTime', 'nonce', 'maxAge', 'subject', 'acr'
  ] as const;
  export type ValidationCheck = (typeof allValidationChecks)[number];
}

/** @internal */
export const DefaultIDTokenValidator: IDTokenValidator = {
  issuedAtGraceInterval: 300,
  // see comment above regarding TS string union/string array. TS threw can error without use of spread operator /shrug
  checks: [...IDTokenValidator.allValidationChecks],

  // eslint-disable-next-line max-statements, complexity
  validate: (
    jwt: JWT,
    issuer: URL,
    clientId: string,
    context: IDTokenValidatorContext = {}
  ): void => {
    for (const check of DefaultIDTokenValidator.checks) {
      switch (check) {

        case 'issuer':
          if (jwt.issuer) {
            const tokenIssuer = new URL(jwt.issuer);
            if (tokenIssuer.href === issuer.href) {
              break;
            }
          }
          throw new JWTError('Invalid issuer (iss) claim');

        case 'audience':
          if (jwt.audience === clientId) {
            break;
          }
          throw new JWTError('invalid audience (aud) claim');

        case 'scheme':
          if (jwt.issuer) {
            const tokenIssuer = new URL(jwt.issuer);
            if (tokenIssuer.protocol === 'https:') {
              break;
            }
          }
          throw new JWTError('issuer (iss) claim requires HTTPS');

        case 'algorithm':
          const { supportedAlgs } = context;
          if (Array.isArray(supportedAlgs) && supportedAlgs.length > 0) {
            if (!supportedAlgs.includes(jwt.header.alg)) {
              throw new JWTError('Unsupported jwt signing algorithm');
            }
          }
          break;

        case 'expirationTime':
          const now = TimeCoordinator.now();
          if (jwt.expirationTime && now.isBefore(jwt.expirationTime)) {
            break;
          }
          throw new JWTError('jwt has expired');

        case 'issuedAtTime':
          if (jwt.issuedAt) {
            const issuedAt: Date = jwt.issuedAt;
            const now = TimeCoordinator.now();
            if (Math.abs(now.timeSince(issuedAt)) <= DefaultIDTokenValidator.issuedAtGraceInterval) {
              break;
            }
          }
          throw new JWTError('issuedAtTime (iat) exceeds grace interval');

        case 'nonce':
          if (context.nonce) {
            if (context.nonce !== jwt.payload['nonce']) {
              throw new JWTError('nonce mismatch');
            }
          }
          break;

        case 'maxAge':
          if (context.maxAge) {
            const authTime = jwt.payload['auth_time'];
            if (!authTime || typeof authTime !== 'number' || !Number.isFinite(authTime)) {
              throw new JWTError('Invalid Authentication Time');
            }

            // compare `auth_time` to a timestamp to determine how long ago authentication was completed
            // the timestamp can either be the issuedAt (iat) claim or a coordinated .now()
            const issuedAt = Timestamp.from(jwt?.issuedAt ?? TimeCoordinator.now());
            const elapsedTime = issuedAt.timeSince(authTime);
            if (elapsedTime > context.maxAge) {
              throw new JWTError('exceeds maxAge');
            }
          }
          break;

        case 'subject':
          if (jwt.subject !== '') {
            break;
          }
          throw new JWTError('Invalid subject (sub) claim');

        case 'acr':
          if (context.acrValues) {
            const acr = jwt.payload.acr;
            if (!acr) {
              throw new JWTError('No acr claim provided when expected');
            }

             // TODO: verify how the acr claim is structured
            if (!(Array.isArray(context.acrValues) && context.acrValues.includes(acr)) && context.acrValues !== acr) {
              throw new JWTError('acr claim does not match expected value');
            }
          }
          break;
      }
    }
  }
};
