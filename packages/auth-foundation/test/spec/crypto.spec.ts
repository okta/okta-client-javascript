import { verifyJWTSignature } from 'src/crypto';
import { mockIDToken } from '@repo/jest-helpers/browser/helpers';


describe('crypto', () => {

  const fakeSigningKey: CryptoKey = {
    algorithm: { name: 'foo' },
    extractable: false,
    type: 'public',
    usages: []
  };

  async function generateTestKey () {
    const algorithm = {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
      modulusLength: 2048,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
    };

    // The "false" here makes it non-exportable
    // https://caniuse.com/mdn-api_subtlecrypto_generatekey
    return crypto.subtle.generateKey(algorithm, false, ['sign', 'verify']);
  }

  let testKey: CryptoKey;

  beforeAll( async () => {
    const { publicKey } = await generateTestKey();
    testKey = publicKey;
  });

  describe('verifyJWTSignature', () => {

    let cryptoVerifyError: Error | null = null;

    beforeEach(() => {
      cryptoVerifyError = null;
      const originalVerify = crypto.subtle.verify.bind(crypto.subtle);
      jest.spyOn(crypto.subtle, 'verify').mockImplementation(async (...args) => {
        try {
          return await originalVerify(...args);
        }
        catch (err) {
          cryptoVerifyError = err as Error;
          throw err;
        }
      });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    // NOTE: happy path is tested as an integration test, see integ/JWT.integ.spec

    it('should return false when a non-imported crypto key is provided', async () => {
      const tokenString = mockIDToken();
      await expect(verifyJWTSignature(tokenString, fakeSigningKey)).resolves.toBe(false);
      expect(crypto.subtle.verify).toHaveBeenCalledTimes(1);
      expect(cryptoVerifyError?.name).toBe('TypeError');
      expect(cryptoVerifyError?.message).toEqual(`Failed to execute 'verify' on 'SubtleCrypto': 2nd argument is not of type CryptoKey.`);
      expect((cryptoVerifyError as DOMException)?.code).toEqual('ERR_INVALID_ARG_TYPE');
    });

    it('should return false when invalid signature is provided', async () => {
      const tokenString = mockIDToken();
      await expect(verifyJWTSignature(tokenString, testKey)).resolves.toBe(false);
      expect(crypto.subtle.verify).toHaveBeenCalledTimes(1);
      expect(cryptoVerifyError).toBe(null);
    });

    it('should return false when no signature is provided', async () => {
      const [ head, body ] = mockIDToken().split('.');
      await expect(verifyJWTSignature(`${head}.${body}.`, testKey)).resolves.toBe(false);
      expect(crypto.subtle.verify).toHaveBeenCalledTimes(0);
      expect(cryptoVerifyError).toBe(null);
    });

    const invalidInputs = [
      '.......',         // all '.' (to stress .split('.') usage)
      '..',              // only 2 '.' (to stress .split('.') usage)
      'a.b',             // non-json header/body, no sig
      'a.b.',            // non-json header/body, no sig with trailing '.'
      '.a.b',            // non-json header/body, no sig with leading '.'
      '.a.b.',           // non-json header/body, no sig with leading/trailing '.'
      '...',             // 3 '.' (to stress .split('.') usage)
      '',                // empty string
      'foobar',          // random non-JWT string
      'a!!!.b.c',        // invalidate base64 encoding characters (will throw from `b64u` - invalid character)
      '😀.😀.😀',         // emojis (non-ascii characters) (will throw from `b64u` - invalid character)
    ];
    test.each(invalidInputs)('gracefully handles malformed input: %s', async (testString) => {
      await expect(verifyJWTSignature(testString, testKey)).resolves.toBe(false);
      expect(crypto.subtle.verify).toHaveBeenCalledTimes(0);
      expect(cryptoVerifyError).toBe(null);   // ensure `crypto.subtle.verify` did not throw
    });
  });
});