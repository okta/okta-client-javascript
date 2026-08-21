import { webcrypto as crypto } from 'node:crypto';
import { randomBytes } from 'node:crypto';


/**
 * Represents a JWKS (JSON Web Key Set) public key.
 */
export interface JWK {
  kty: string;
  use: string;
  kid: string;
  n: string;
  e: string;
  alg: string;
}

/**
 * Represents a generated key pair with public key in JWKS format.
 */
export interface KeyPair {
  publicKeyJWK: JWK;
  publicKey: CryptoKey;
  privateKey: CryptoKey;
  keyId: string;
}

/**
 * Generate an RSA key pair using WebCrypto.
 * Returns the public key in JWKS format and CryptoKey objects.
 *
 * @returns KeyPair object with public/private keys
 */
export async function generateKeyPair(): Promise<KeyPair> {
  const keyId = randomBytes(16).toString('hex').substring(0, 10);

  // Generate RSA key pair using WebCrypto
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: 'SHA-256',
    },
    true, // extractable
    ['sign', 'verify']
  );

  // Export public key to JWK format
  const publicKeyJWK = (await crypto.subtle.exportKey(
    'jwk',
    keyPair.publicKey
  )) as JWK & { n: string; e: string };

  // Ensure the JWK has all required fields
  const jwk: JWK = {
    kty: publicKeyJWK.kty,
    use: 'sig',
    kid: keyId,
    alg: 'RS256',
    n: publicKeyJWK.n,
    e: publicKeyJWK.e,
  };

  return {
    publicKeyJWK: jwk,
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
    keyId,
  };
}
