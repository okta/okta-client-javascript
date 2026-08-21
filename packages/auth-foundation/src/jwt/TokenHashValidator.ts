/**
 * @module
 * @mergeModuleWith Core
 */


import type { JWT } from './JWT.ts';
import { b64u, buf } from '../crypto/index.ts';
import { JWTError } from '../errors/index.ts';
import { validateString } from '../utils/validators.ts';

/**
 * A validator for validating tokens via hash claims. Used in OIDC to validate access tokens (`at_hash`) and
 * device secrets (`ds_hash`) associated with an ID token
 * 
 * @group JWT
 * @see
 * * {@link https://openid.net/specs/openid-connect-core-1_0.html#CodeFlowTokenValidation | OIDC Spec: Access Token Validation}
 * * {@link https://openid.net/specs/openid-connect-native-sso-1_0.html#section-3.4.1-2.1.2.2 | OIDC Native SSO: ID Token Claims }
 */
export interface TokenHashValidator {
  validate: (token: string, idToken: JWT) => Promise<void>;
}

/** @internal */
export function DefaultTokenHashValidator(hashKey: string): TokenHashValidator {
  const claimKeys = {
    accessToken: 'at_hash',
    // deviceSecret: 'ds_hash'
  };
  const claimKey = claimKeys[hashKey];

  return {
    validate: async (token: string, idToken: JWT): Promise<void> => {
      if (!validateString(token)) {
        throw new TypeError('"token" cannot be an empty string');
      }

      let intArr: Uint8Array;
      switch (idToken.header.alg) {
        case 'RS256':
          intArr = new Uint8Array(await crypto.subtle.digest('SHA-256', buf(token)));
          break;
        default:
          throw new JWTError('Unsupported Algorithm');
      }

      const leftmostHash = intArr.slice(0, intArr.length / 2);
      if (b64u(leftmostHash) !== idToken.claims[claimKey]) {
        throw new JWTError('Signature Invalid');
      }
    }
  };
}
