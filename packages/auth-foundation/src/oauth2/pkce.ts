/**
 * @module
 * @mergeModuleWith OAuth2
 */

import { randomBytes, hash } from '../crypto/index.ts';
import { validateString } from '../internals/validators.ts';


/**
 * @group PKCE
 */
export type PKCE = PKCE.Challenge & PKCE.Verifier;

async function calculatePKCECodeChallenge (codeVerifier: string): Promise<string> {
  if (!validateString(codeVerifier)) {
    throw new TypeError('"codeVerifier" cannot be an empty string');
  }

  return hash(codeVerifier);
}

async function generatePKCE (method = 'S256'): Promise<PKCE> {
  const verifier = randomBytes();
  const challenge = await calculatePKCECodeChallenge(verifier);
  return { challenge, verifier, method };
}

/**
 * @group PKCE
 */
export namespace PKCE {
  export type Challenge = {
    challenge: string;
    method: string;
  };

  export type Verifier = {
    verifier: string;
  };

  export const generate = generatePKCE;
}
