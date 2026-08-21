/**
 * @module
 * @mergeModuleWith Core
 */


import type { JWT } from './JWT.ts';
import { JWTError } from '../errors/index.ts';
import { buf, b64u } from '../crypto/index.ts';

/**
 * Defines properties of a JSON Web Key
 * @group JWT
 * 
 * @remarks
 * Currently only `RSA`/`RS256` are supported.
 * 
 * @see
 * * {@link https://datatracker.ietf.org/doc/html/rfc7517#section-4 | RFC 7517 - JSON Web Key (JWK) Format}
 */
export interface JWK extends JsonWebKey {
  /**
   * Key Type
   * @see {@link https://datatracker.ietf.org/doc/html/rfc7517#section-4.1 | RFC 7517 - "kty" (Key Type) Parameter}
   */
  kty: 'RSA'
  /**
   * Algorithm
   * @see {@link https://datatracker.ietf.org/doc/html/rfc7517#section-4.4 | RFC 7517 - "alg" (Algorithm) Parameter}
   */
  alg: JWK.Algorithm;
  /**
   * Key ID
   * @see {@link https://datatracker.ietf.org/doc/html/rfc7517#section-4.5 | RFC 7517 - "kid" (Key ID) Parameter}
   */
  kid: string;
  /**
   * "Use" (public key use)
   * @remarks
   * According to RFC 7517, `sig` and `enc` are defined, but any value may be used.
   * @see {@link https://datatracker.ietf.org/doc/html/rfc7517#section-4.2 | RFC 7517 - "use" (Public Key Use) Parameter}
   */
  use?: 'sig' | 'enc' | string;

}

/**
 * Alias for `JWK[]`.
 * @group JWT
 */
export type JWKS = JWK[];

/**
 * Verifies the signature of a {@link JWT} signed by a {@link JWK}.
 * @remarks
 * Accepts a {@link JWKS} (aka `JWK[]`) to ease use with the results of a `jwks_uri` request.
 * @group JWT
 * @see
 * * {@link https://datatracker.ietf.org/doc/html/rfc7519| RFC 7519 - JSON Web Token (JWT)}
 * * {@link https://datatracker.ietf.org/doc/html/rfc7517| RFC 7517 - JSON Web Key (JWK)}
 */
export type JWKValidator = {
  validate: (token: JWT, keySet: JWKS) => Promise<boolean>;
};

type SubtleAlgoritm = RsaHashedImportParams;

function jwkToCryptoAlg (jwk: JWK): SubtleAlgoritm {
  switch (jwk.alg) {
    case 'RS256':
      return {
        name: 'RSASSA-PKCS1-v1_5',
        hash: { name: 'SHA-256' }
      };
    default:
      throw new JWTError('Unknown jwk algorithm');
  }
}

/** @internal */
export const DefaultJWKValidator: JWKValidator = {
  validate: async (token: JWT, keySet: JWKS): Promise<boolean> => {
    const jwk = keySet.find(k => k.kid === token.header?.kid);

    if (!jwk) {
      throw new JWTError('No public key found');
    }

    const components = token.rawValue.split('.');
    const signature = components.pop();
    const payload = components.join('.');

    const subtleAlg: SubtleAlgoritm = jwkToCryptoAlg(jwk);
    const key: CryptoKey = await crypto.subtle.importKey('jwk', jwk, subtleAlg, true, ['verify']);
    const verified = await crypto.subtle.verify(subtleAlg, key, b64u(signature!), buf(payload));

    return verified;
  }
};

/**
 * {@inheritDoc JWK}
 * @group JWT
 */
export namespace JWK {
  // TODO: add other algorithms
  export type Algorithm = 'RS256'

  // TODO: add following enums (are they even needed? JS crypto libs expect JWK format already)
  // https://github.com/okta/okta-mobile-swift/blob/ee28a74e47e8f6b3526ccf4e312d3d61b4108966
  // /Sources/AuthFoundation/JWT/Enums/JWK%2BEnums.swift#L15
  // TODO: enum Usage
  // TODO: enum KeyType
  export const validator: JWKValidator = DefaultJWKValidator;
}
