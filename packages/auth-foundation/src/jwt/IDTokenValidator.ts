/* eslint max-depth: [2, 4] */
import type { JWT } from './JWT';
import { JWTError } from '../errors';
import TimeCoordinator, { Timestamp } from '../utils/TimeCoordinator';

/**
 * @group JWT & Token Verification
 */
export interface IDTokenValidatorContext {
  nonce?: string;
  maxAge?: number;
  supportedAlgs?: string[];
}

/**
 * @group JWT & Token Verification
 */
export interface IDTokenValidator {
  issuedAtGraceInterval: number;
  checks: IDTokenValidator.ValidationCheck[];

  validate: (token: JWT, issuer: URL, clientId: string, context?: IDTokenValidatorContext) => void;
}

/**
 * @group JWT & Token Verification
 */
export namespace IDTokenValidator {
  // ref: https://stackoverflow.com/questions/44480644/string-union-to-string-array
  export const allValidationChecks = [
    'issuer', 'audience', 'scheme', 'algorithm', 'expirationTime', 'issuedAtTime', 'nonce', 'maxAge', 'subject'
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
            if (elapsedTime > 0 && elapsedTime <= context.maxAge) {
              throw new JWTError('exceeds maxAge');
            }
          }
          break;

        case 'subject':
          if (jwt.subject !== '') {
            break;
          }
          throw new JWTError('Invalid subject (sub) claim');

      }
    }
  }
};
