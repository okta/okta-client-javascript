import { randomBytes, hash } from '../crypto';
import { validateString } from '../internals/validators';

/**
 * @group PKCE
 */
export interface PKCE {
  challenge: string;
  verifier: string;
  method: string;
}

async function calculatePKCECodeChallenge(codeVerifier: string): Promise<string> {
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
  export const generate = generatePKCE;
}
