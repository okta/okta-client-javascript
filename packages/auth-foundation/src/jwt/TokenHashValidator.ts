/**
 * @module
 * @mergeModuleWith Core
 */


import type { JWT } from './JWT.ts';
import { b64u, buf } from '../crypto/index.ts';
import { JWTError } from '../errors/index.ts';
import { validateString } from '../internals/validators.ts';

/**
 * @group JWT
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
