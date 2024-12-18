import type { JWT } from './JWT';
import { JWTError } from '../errors';
import { buf, b64u } from '../crypto';

/**
 * @group JWT & Token Verification
 */
export interface JWK extends JsonWebKey {
  alg: JWK.Algorithm;
  kid: string;
}

/**
 * @group JWT & Token Verification
 */
export type JWKS = JWK[];

/**
 * @group JWT & Token Verification
 */
export type JWKValidator = {
  validate: (token: JWT, keySet: JWKS) => Promise<boolean>;
};

/**
 * @group JWT & Token Verification
 */
export type SubtleAlgoritm = RsaHashedImportParams;

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
    const jwk = keySet.find(k => k.kid === token.header.kid);

    if (!jwk) {
      throw new JWTError('Invalid key');
    }

    const components = token.rawValue.split('.');
    const signature = components.pop();
    const payload = components.join('.');

    // TODO: consider `delete key.use` for IE11 support (see authjs verifyToken) before importKey()
    const subtleAlg: SubtleAlgoritm = jwkToCryptoAlg(jwk);
    const key: CryptoKey = await crypto.subtle.importKey('jwk', jwk, subtleAlg, true, ['verify']);
    const verified = await crypto.subtle.verify(subtleAlg, key, b64u(signature!), buf(payload));

    return verified;
  }
};

/**
 * @group JWT & Token Verification
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
