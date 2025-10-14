import { CredentialError } from '@okta/auth-foundation';
import { Token } from 'src/platform';
import { BrowserTokenStorage } from 'src/Credential/TokenStorage';
import { makeTestToken, MockIndexedDBStore } from '../helpers/makeTestResource';

describe('BrowserTokenStorage' , () => {
  it('can construct', () => {
    const storage = new BrowserTokenStorage();
    expect(storage).toBeInstanceOf(BrowserTokenStorage);
  });

  // NOTE: unit tests do not test `encryptAtRest` feature. This would require the mocking of too many methods
  // and resulting tests would mostly be testing the mocks, not that actual logic
  describe('methods', () => {
    let storage: BrowserTokenStorage;
    let onAdded;
    let onRemoved;
    let onReplaced;
    let onDefaultChanged;
    let onMetadataUpdated;

    beforeEach(() => {
      localStorage.clear();

      onAdded = jest.fn();
      onRemoved = jest.fn();
      onReplaced = jest.fn();
      onDefaultChanged = jest.fn();
      onMetadataUpdated = jest.fn();

      storage = new BrowserTokenStorage();
      storage.encryptAtRest = false;    // see NOTE above

      storage.emitter.on('token_added', onAdded);
      storage.emitter.on('token_removed', onRemoved);
      storage.emitter.on('token_replaced', onReplaced);
      storage.emitter.on('default_changed', onDefaultChanged);
      storage.emitter.on('metadata_updated', onMetadataUpdated);
    });

    test('setDefaultTokenId', async () => {
      expect(storage.defaultTokenId).toEqual(null);
      const t1 = makeTestToken();
      await storage.add(t1);
      expect(storage.defaultTokenId).toEqual(t1.id);

      storage.defaultCredentialKey = 'foo';
      expect(storage.defaultTokenId).toEqual(null);
    });
  
    test('allIDs', async () => {
      await expect(storage.allIDs()).resolves.toEqual([]);
      const tokens = [ makeTestToken(), makeTestToken(), makeTestToken() ];
      await Promise.all(tokens.map(t => storage.add(t)));
      await expect(storage.allIDs()).resolves.toEqual(tokens.map(t => t.id));
    });

    describe('add', () => {
      it('adds tokens and metadata to storage', async () => {
        // ensure storage is empty
        await expect(storage.allIDs()).resolves.toEqual([]);
        
        const t1 = makeTestToken();
        await storage.add(t1);
        await expect(storage.allIDs()).resolves.toEqual([t1.id]);
        await expect(storage.get(t1.id)).resolves.toEqual(t1);
        expect(onAdded).toHaveBeenNthCalledWith(1, { storage, id: t1.id, token: t1 });
        // ensure default was updated as well
        expect(storage.defaultTokenId).toEqual(t1.id);
        expect(onDefaultChanged).toHaveBeenNthCalledWith(1, { storage, id: t1.id });
  
        const t2 = makeTestToken();
        const t2Meta = Token.Metadata(t2, ['foo', 'bar']);
        await storage.add(t2, t2Meta);
        await expect(storage.allIDs()).resolves.toEqual([t1.id, t2.id]);
        await expect(storage.get(t2.id)).resolves.toEqual(t2);
        expect(onAdded).toHaveBeenNthCalledWith(2, { storage, id: t2.id, token: t2 });
        // ensure default was *NOT* updated
        expect(storage.defaultTokenId).toEqual(t1.id);
        expect(onDefaultChanged).toHaveBeenCalledTimes(1);
      });

      it('throws when incorrect meta is provided', async () => {
        const t1 = makeTestToken();
        const t2 = makeTestToken();
        const meta = Token.Metadata(t2);
        await expect(() => storage.add(t1, meta)).rejects.toThrow(new CredentialError('metadataConsistency'));
      });

      it('throws when a duplicate token is added', async () => {
        const t1 = makeTestToken();
        await storage.add(t1);
        await expect(() => storage.add(t1)).rejects.toThrow(new CredentialError('duplicateTokenAdded'));
      });
    });

    describe('replace', () => {
      it('replaces existing token in storage', async () => {
        const t1 = makeTestToken();
        await storage.add(t1);
        await expect(storage.get(t1.id)).resolves.toEqual(t1);
  
        const t2 = makeTestToken(t1.id);    // Tokens have the same id
        await storage.replace(t1.id, t2);
        await expect(storage.get(t1.id)).resolves.toEqual(t2);
      });

      it('throws if original token does not exist', async () => {
        const t1 = makeTestToken();
        const t2 = makeTestToken(t1.id);    // Tokens have the same id
        await expect(() => storage.replace(t1.id, t2)).rejects.toThrow(new CredentialError('cannotReplaceToken'));
      });
    });

    test('remove', async () => {
      const t1 = makeTestToken();
      const t2 = makeTestToken();
      await storage.add(t1);
      await storage.add(t2);
      onDefaultChanged.mockReset();   // reset mock, storage.add will fire event

      await expect(storage.get(t1.id)).resolves.toEqual(t1);
      await expect(storage.get(t2.id)).resolves.toEqual(t2);
      expect(storage.defaultTokenId).toEqual(t1.id);

      storage.remove(t2.id);
      await expect(storage.get(t2.id)).resolves.toEqual(null);
      expect(onRemoved).toHaveBeenNthCalledWith(1, { storage, id: t2.id });
      expect(onDefaultChanged).not.toHaveBeenCalled();
      expect(storage.defaultTokenId).toEqual(t1.id);

      await storage.remove(t1.id);
      await expect(storage.get(t1.id)).resolves.toEqual(null);
      expect(onRemoved).toHaveBeenNthCalledWith(2, { storage, id: t1.id });
      expect(onDefaultChanged).toHaveBeenNthCalledWith(1, { storage, id: null });
    });

    test('get', async () => {
      const t1 = makeTestToken();
      const t2 = makeTestToken();
      await storage.add(t1);

      await expect(storage.get(t1.id)).resolves.toEqual(t1);
      await expect(storage.get(t2.id)).resolves.toEqual(null);

      await storage.remove(t1.id);
      await expect(storage.get(t1.id)).resolves.toEqual(null);
    });

    test('getMetadata', async () => {
      const t1 = makeTestToken();
      const metadata = Token.Metadata(t1);
      const t2 = makeTestToken();
      await storage.add(t1, metadata);

      await expect(storage.getMetadata(t1.id)).resolves.toEqual(metadata);
      await expect(storage.getMetadata(t2.id)).resolves.toEqual(null);

      await storage.remove(t1.id);
      await expect(storage.getMetadata(t1.id)).resolves.toEqual(null);
    });

    describe('setMetadata', () => {
      it('sets metadata associated with token in storage', async () => {
        const t1 = makeTestToken();
        const m1 = Token.Metadata(t1);
        await storage.add(t1, m1);
        await expect(storage.getMetadata(t1.id)).resolves.toEqual(m1);
  
        const m2 = Token.Metadata(t1, ['foo', 'bar']);
        await storage.setMetadata(m2);
        await expect(storage.getMetadata(t1.id)).resolves.toEqual(m2);
        expect(onMetadataUpdated).toHaveBeenNthCalledWith(1, { storage, id: m2.id, metadata: m2 });
      });

      it('throws if original token does not exist', async () => {
        const t1 = makeTestToken();
        const metadata = Token.Metadata(t1);
        await expect(() => storage.setMetadata(metadata)).rejects.toThrow(new CredentialError('metadataConsistency'));
        expect(onMetadataUpdated).not.toHaveBeenCalled();
      });
    });

    test('clear', async () => {
      await expect(storage.allIDs()).resolves.toEqual([]);
      const tokens = [ makeTestToken(), makeTestToken(), makeTestToken() ];
      await Promise.all(tokens.map(t => storage.add(t)));
      await expect(storage.allIDs()).resolves.toEqual(tokens.map(t => t.id));

      await storage.clear();
      await expect(storage.allIDs()).resolves.toEqual([]);
    });
  });

  describe('configurations', () => {
    describe('encryptAtRest', () => {
      // Using crypto libraries directly (instead of mocking) seems to cause random failures when calling .encrypt
      // Before tests would pass/fail 50/50, after adding this retry the tests have not failed
      jest.retryTimes(3);

      let storage: BrowserTokenStorage;
      let encryptionKeyStore: MockIndexedDBStore<CryptoKey>;

      beforeEach(() => {
        localStorage.clear();

        storage = new BrowserTokenStorage();
        encryptionKeyStore = new MockIndexedDBStore<CryptoKey>();
        // @ts-ignore
        storage.encryptionKeyStore = encryptionKeyStore;
      });

      // NOTE: potentially flaky test
      it('encrypts and decrypts tokens in/out of storage', async () => {
        const expectedKey = {
          type: 'secret',
          extractable: false,
          algorithm: { name: 'AES-GCM', length: 256 },
          usages: ['encrypt', 'decrypt']
        };

        await expect(storage.encryptionKeyStore.get(storage.encryptionKeyName)).resolves.toBe(null);

        const t1 = makeTestToken();
        await storage.add(t1);

        // cannot assert .instanceOf(CryptoKey) - Jest throws 'CryptoKey' not defined
        await expect(storage.encryptionKeyStore.get(storage.encryptionKeyName)).resolves.toMatchObject(expectedKey);

        const t2 = makeTestToken();
        await storage.add(t2);

        const t1Stored = JSON.parse(localStorage.getItem((storage as any).idToStoreKey(t1.id))!).token;
        expect(typeof t1Stored).toBe('string');
        expect(t1Stored).not.toEqual(t1.toJSON());
        const t2Stored = JSON.parse(localStorage.getItem((storage as any).idToStoreKey(t2.id))!).token;
        expect(typeof t2Stored).toBe('string');
        expect(t2Stored).not.toEqual(t2.toJSON());

        await storage.remove(t1.id);
        await expect(storage.encryptionKeyStore.get(storage.encryptionKeyName)).resolves.toMatchObject(expectedKey);
        await storage.remove(t2.id);
        // confirm signing key is removed when storage is emptied
        await expect(storage.encryptionKeyStore.get(storage.encryptionKeyName)).resolves.toBe(null);
      });

      it('can gracefully handle `encryptedAtRest` flag being toggled', async () => {
        const encryptedToken = makeTestToken();
        await storage.add(encryptedToken);

        await expect(storage.get(encryptedToken.id)).resolves.toEqual(encryptedToken);
        storage.encryptAtRest = false;
        await expect(storage.get(encryptedToken.id)).resolves.toEqual(encryptedToken);

        const unencryptedToken = makeTestToken();
        await storage.add(unencryptedToken);

        await expect(storage.get(unencryptedToken.id)).resolves.toEqual(unencryptedToken);
        storage.encryptAtRest = true;
        await expect(storage.get(unencryptedToken.id)).resolves.toEqual(unencryptedToken);

        storage.encryptAtRest = false;
        await expect(storage.get(encryptedToken.id)).resolves.toEqual(encryptedToken);
        await expect(storage.get(encryptedToken.id)).resolves.toEqual(encryptedToken);

        storage.encryptAtRest = true;
        await expect(storage.get(encryptedToken.id)).resolves.toEqual(encryptedToken);
        await expect(storage.get(unencryptedToken.id)).resolves.toEqual(unencryptedToken);
      });

      it('removes token from storage when decryption fails, is found', async () => {
        const token = makeTestToken();
        await storage.add(token);

        await expect(storage.allIDs()).resolves.toEqual([token.id]);
        await expect(storage.get(token.id)).resolves.toEqual(token);

        // removes encryption keys, encrypted tokens will no longer be retrievable
        await storage.encryptionKeyStore.clear();

        await expect(storage.allIDs()).resolves.toEqual([token.id]);
        // .get will trigger removal when decryption fails
        await expect(storage.get(token.id)).resolves.toEqual(null);

        await expect(storage.allIDs()).resolves.toEqual([]);
        expect(encryptionKeyStore.cache.size).toBe(0);    // ensures not encryption keys remain
      });
    });

    describe('includeClaims', () => {
      it('stores token metadata with idToken claims', async () => {
        const storage = new BrowserTokenStorage();
        storage.encryptAtRest = false;
        storage.includeClaims = true;   // enables configuration

        const t1 = makeTestToken();
        await storage.add(t1);
        await expect(storage.getMetadata(t1.id)).resolves.toEqual({
          ...Token.Metadata(t1),
          claims: { ...t1.idToken?.payload }
        });
      });
    });
  });
});
