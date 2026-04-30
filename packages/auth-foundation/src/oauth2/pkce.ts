/**
 * @module
 * @mergeModuleWith OAuth2
 */

import { randomBytes, hash } from '../crypto/index.ts';
import { validateString } from '../utils/validators.ts';


/**
 * Defines the properties returned by {@link PKCE.generate}
 * @group PKCE
 */
export type PKCE = PKCE.Challenge & PKCE.Verifier;

async function calculatePKCECodeChallenge (codeVerifier: string): Promise<string> {
  if (!validateString(codeVerifier)) {
    throw new TypeError('"codeVerifier" cannot be an empty string');
  }

  return hash(codeVerifier);
}

/**
 * Generates a `PKCE` challenge and verifier.
 * 
 * @remarks
 * Currently `S256` is the only hashing algorithm available. Per spec, `plain` (unhashed) challenges
 * are valid for client which are unable to perform `S256`, but this isn't implemented within this client
 */
async function generatePKCE (method = 'S256'): Promise<PKCE> {
  const verifier = randomBytes();
  const challenge = await calculatePKCECodeChallenge(verifier);
  return { challenge, verifier, method };
}

/**
 * @group PKCE
 */
export namespace PKCE {
  /**
   * Represents PKCE `code_challenge`
   * 
   * @see {@link https://datatracker.ietf.org/doc/html/rfc7636#section-4.2 | RFC 7636 - Client Creates the Code Challenge}
   */
  export type Challenge = {
    challenge: string;
    method: string;
  };

  /**
   * Represents PKCE `code_verifier`
   * 
   * @see {@link https://datatracker.ietf.org/doc/html/rfc7636#section-4.1 | RFC 7636 - Client Creates the Code Verifier}
   */
  export type Verifier = {
    verifier: string;
  };

  /** @reexport */
  export const generate = generatePKCE;
}
