import { installWebCryptoPolyfill } from '../../src/index';

describe('subtle.importKey', () => {
  beforeAll(() => {
    installWebCryptoPolyfill();
  });

  it('should import a JWK and return a CryptoKey', async () => {
    const jwk = {
      kty: 'RSA',
      n: 'test-modulus',
      e: 'AQAB',
      alg: 'RS256',
    };

    const algorithm = { name: 'RSASSA-PKCS1-v1_5', hash: { name: 'SHA-256' } };
    const key = await global.crypto.subtle.importKey(
      'jwk',
      jwk,
      algorithm,
      false,
      ['verify']
    );

    expect(key).toBeDefined();
    expect(key.type).toBe('public');
    expect(key.extractable).toBe(false);
    expect(key.usages).toEqual(['verify']);
    expect(key.algorithm).toEqual(algorithm);
  });

  it('should reject unsupported format', async () => {
    try {
      await global.crypto.subtle.importKey(
        'raw' as any,
        new Uint8Array([1, 2, 3]),
        { name: 'RSASSA-PKCS1-v1_5', hash: { name: 'SHA-256' } },
        false,
        ['verify']
      );
      fail('Expected DOMException to be thrown');
    } catch (error) {
      if (error instanceof DOMException) {
        expect(error.name).toBe('NotSupportedError');
      } else {
        throw error;
      }
    }
  });

  it('should reject SPKI format', async () => {
    try {
      await global.crypto.subtle.importKey(
        'spki' as any,
        new Uint8Array([1, 2, 3]),
        { name: 'RSASSA-PKCS1-v1_5', hash: { name: 'SHA-256' } },
        false,
        ['verify']
      );
      fail('Expected DOMException to be thrown');
    } catch (error) {
      if (error instanceof DOMException) {
        expect(error.name).toBe('NotSupportedError');
      } else {
        throw error;
      }
    }
  });
});
