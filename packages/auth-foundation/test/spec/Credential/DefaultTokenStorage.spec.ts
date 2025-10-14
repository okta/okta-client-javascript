import { DefaultTokenStorage, TokenStorage } from 'src/Credential/TokenStorage';
import { Token } from 'src/Token';
import { CredentialError } from 'src/errors';
import { makeTestToken } from '../../helpers/makeTestResource';


describe('DefaultTokenStorage' , () => {
  it('can construct', () => {
    const storage = new DefaultTokenStorage();
    expect(storage).toBeInstanceOf(DefaultTokenStorage);
  });

  describe('methods', () => {
    let storage: TokenStorage;
    let onAdded;
    let onRemoved;
    let onReplaced;
    let onDefaultChanged;
    let onMetadataUpdated;

    beforeEach(() => {
      onAdded = jest.fn();
      onRemoved = jest.fn();
      onReplaced = jest.fn();
      onDefaultChanged = jest.fn();  
      onMetadataUpdated = jest.fn();

      storage = new DefaultTokenStorage();
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

      await storage.remove(t2.id);
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
});
