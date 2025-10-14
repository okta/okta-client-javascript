import { DPoPError } from 'src/errors';
import { DPoPStorage } from 'src/oauth2/dpop/storage';


async function generateKeyPair (): Promise<CryptoKeyPair> {
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

describe('DPoPStorage', () => {

  describe('MemoryStore', () => {
    it('can store, retrieve and delete Crypto Key pairs', async () => {
      const store = new DPoPStorage.MemoryStore();
      const keyPair = await generateKeyPair();

      expect(await store.get('foo')).toBe(null);
      await store.add('foo', keyPair);
      expect(await store.get('foo')).toBe(keyPair);
      await store.remove('foo');
      expect(await store.get('foo')).toBe(null);
      await store.add('foo', keyPair);
      expect(await store.get('foo')).toBe(keyPair);
      await store.clear();

      // cannot overwrite a key pair at a given id
      expect(await store.get('foo')).toBe(null);
      await store.add('foo', keyPair);
      await expect(store.add('foo', keyPair)).rejects.toThrow(DPoPError);
    });
  });

});
