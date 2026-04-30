import { installWebCryptoPolyfill } from '../../src/index';

describe('subtle.verify', () => {
  let testKey: CryptoKey;

  beforeAll(async () => {
    installWebCryptoPolyfill();

    // Import a test key to use for verification
    const jwk = {
      kty: 'RSA',
      n: 'test-modulus',
      e: 'AQAB',
      alg: 'RS256',
    };

    testKey = await global.crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'RSASSA-PKCS1-v1_5', hash: { name: 'SHA-256' } },
      false,
      ['verify']
    );
  });

  it('should verify a signature (mock returns true)', async () => {
    const signature = new Uint8Array(256).buffer; // mock RSA signature
    const data = new TextEncoder().encode('test data');

    const result = await global.crypto.subtle.verify(
      { name: 'RSASSA-PKCS1-v1_5' },
      testKey,
      signature,
      data
    );

    expect(result).toBe(true);
  });

  it('should accept algorithm as a string', async () => {
    const signature = new Uint8Array(256).buffer;
    const data = new TextEncoder().encode('test data');

    const result = await global.crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      testKey,
      signature,
      data
    );

    expect(result).toBe(true);
  });

  it('should reject if key is not in the key map', async () => {
    const orphanKey: CryptoKey = {
      algorithm: { name: 'RSASSA-PKCS1-v1_5' },
      extractable: false,
      type: 'public',
      usages: ['verify'],
    };

    const signature = new Uint8Array(256).buffer;
    const data = new TextEncoder().encode('test data');

    try {
      await global.crypto.subtle.verify(
        { name: 'RSASSA-PKCS1-v1_5' },
        orphanKey,
        signature,
        data
      );
      fail('Expected DOMException to be thrown');
    } catch (error) {
      if (error instanceof DOMException) {
        expect(error.name).toBe('InvalidAccessError');
      } else {
        throw error;
      }
    }
  });

  it('should reject unsupported algorithm', async () => {
    const signature = new Uint8Array(256).buffer;
    const data = new TextEncoder().encode('test data');

    try {
      await global.crypto.subtle.verify(
        { name: 'RSA-PSS' },
        testKey,
        signature,
        data
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

  it('should reject if key usages do not include verify', async () => {
    const signOnlyJwk = {
      kty: 'RSA',
      n: 'another-modulus',
      e: 'AQAB',
      alg: 'RS256',
    };

    const signOnlyKey = await global.crypto.subtle.importKey(
      'jwk',
      signOnlyJwk,
      { name: 'RSASSA-PKCS1-v1_5', hash: { name: 'SHA-256' } },
      false,
      ['sign'] // no 'verify' usage
    );

    const signature = new Uint8Array(256).buffer;
    const data = new TextEncoder().encode('test data');

    try {
      await global.crypto.subtle.verify(
        { name: 'RSASSA-PKCS1-v1_5' },
        signOnlyKey,
        signature,
        data
      );
      fail('Expected DOMException to be thrown');
    } catch (error) {
      if (error instanceof DOMException) {
        expect(error.name).toBe('InvalidAccessError');
      } else {
        throw error;
      }
    }
  });
});

describe('stubbed DPoP methods', () => {
  beforeAll(() => {
    installWebCryptoPolyfill();
  });

  it('exportKey should throw NotSupportedError', async () => {
    try {
      await global.crypto.subtle.exportKey('jwk', {} as CryptoKey);
      fail('Expected DOMException to be thrown');
    } catch (error) {
      if (error instanceof DOMException) {
        expect(error.name).toBe('NotSupportedError');
      } else {
        throw error;
      }
    }
  });

  it('sign should throw NotSupportedError', async () => {
    try {
      await global.crypto.subtle.sign('RSASSA-PKCS1-v1_5', {} as CryptoKey, new ArrayBuffer(0));
      fail('Expected DOMException to be thrown');
    } catch (error) {
      if (error instanceof DOMException) {
        expect(error.name).toBe('NotSupportedError');
      } else {
        throw error;
      }
    }
  });

  it('generateKey should throw NotSupportedError', async () => {
    try {
      await global.crypto.subtle.generateKey(
        { name: 'RSASSA-PKCS1-v1_5' } as any,
        false,
        ['sign', 'verify']
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
