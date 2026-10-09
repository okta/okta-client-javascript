import { JWT, OAuth2Client } from '@okta/auth-foundation';
import { b64u, buf } from '@okta/auth-foundation/internal';
import { ResourceOwnerFlow } from '@okta/oauth2-flows';


const { ISSUER, NATIVE_CLIENT_ID, USERNAME, PASSWORD } = process.env;

describe('JWT', () => {

  /**
   * Uses Resource Owner flow to obtain real tokens from Okta Auth Server
   */
  describe('verifySignature / validate', () => {
    const client = new OAuth2Client({
      issuer: ISSUER!,
      clientId: NATIVE_CLIENT_ID!,
      scopes: 'openid profile offline_access',
    })
    const flow = new ResourceOwnerFlow(client);

    const getToken = async () => {
      return await flow.start(USERNAME!, PASSWORD!);
    };

    let token, jwks;

    beforeAll(async () => {
      jwks = await client.jwks();
      token = await getToken();   // uses ResourceOwner flow to get a real token from AS
    });

    describe('using JWKS', () => {
      it('verifies the signature of a valid id_token', async () => {
        const jwt = new JWT(token.idToken!.rawValue);

        await expect(jwt.verifySignature(jwks)).resolves.toBe(true);
      });

      it('returns false when JWT has wrong signature', async () => {
        const [ head, body ] = token.idToken!.rawValue.split('.');
        const jwt = new JWT(`${head}.${body}.fakesign`);

        await expect(jwt.verifySignature(jwks)).resolves.toBe(false);
      });

      it('returns false when JWT has wrong body', async () => {
        const [ head, _, sig ] = token.idToken!.rawValue.split('.');
        const fakebody = b64u(buf(JSON.stringify({ foo: 'bar' })));
        const jwt = new JWT(`${head}.${fakebody}.${sig}`);

        await expect(jwt.verifySignature(jwks)).resolves.toBe(false);
      });

      it('throws when no key can be found', async () => {
        const [ _, body, sig ] = token.idToken!.rawValue.split('.');
        const fakehead = b64u(buf(JSON.stringify({ ...token.idToken!.header, kid: 'foo' })));
        const jwt = new JWT(`${fakehead}.${body}.${sig}`);

        await expect(jwt.verifySignature(jwks)).rejects.toThrow(new Error('No public key found'));
      });
    });

    describe('using CryptoKey', () => {
      let key;

      beforeAll(async () => {
        // finds the validate public key from the jwks endpoint, import directly to get `CryptoKey` instance
        const jwk = jwks.find(k => k.kid === token.idToken.header?.kid);
        const alg = {
          name: 'RSASSA-PKCS1-v1_5',
          hash: { name: 'SHA-256' }
        };
        key = await crypto.subtle.importKey('jwk', jwk, alg, true, ['verify']);
      });

      it('verifies the signature of a valid id_token', async () => {
        const jwt = new JWT(token.idToken!.rawValue);

        await expect(jwt.verifySignature(key)).resolves.toBe(true);
      });

      it('returns false when JWT has wrong signature', async () => {
        const [ head, body ] = token.idToken!.rawValue.split('.');
        const jwt = new JWT(`${head}.${body}.fakesign`);

        await expect(jwt.verifySignature(key)).resolves.toBe(false);
      });

      it('returns false when JWT has wrong body', async () => {
        const [ head, _, sig ] = token.idToken!.rawValue.split('.');
        const fakebody = b64u(buf(JSON.stringify({ foo: 'bar' })));
        const jwt = new JWT(`${head}.${fakebody}.${sig}`);

        await expect(jwt.verifySignature(key)).resolves.toBe(false);
      });

      it('returns false when wrong key is provided', async () => {
        const jwt = new JWT(token.idToken!.rawValue);

        const jwk = jwks.find(k => k.kid === token.idToken.header?.kid);
        jwk.n = 'somefakevalue';    // override JWK 
        const alg = {
          name: 'RSASSA-PKCS1-v1_5',
          hash: { name: 'SHA-256' }
        };
        const fakekey = await crypto.subtle.importKey('jwk', jwk, alg, true, ['verify']);

        await expect(jwt.verifySignature(fakekey)).resolves.toBe(false);
      });
    });
  });

});
