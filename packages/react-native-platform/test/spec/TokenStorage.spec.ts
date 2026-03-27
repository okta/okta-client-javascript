// Mock the native bridge
jest.mock('src/specs/NativeTokenStorageBridge', () => {
  return {
    __esModule: true,
    default: {
      getAllTokenIds: jest.fn().mockResolvedValue([]),
      getToken: jest.fn().mockResolvedValue(null),
      saveToken: jest.fn().mockResolvedValue(undefined),
      clearTokens: jest.fn().mockResolvedValue(undefined),
      getMetadata: jest.fn().mockResolvedValue(null),
      saveMetadata: jest.fn().mockResolvedValue(undefined),
      removeToken: jest.fn().mockResolvedValue(undefined),
      getDefaultTokenId: jest.fn().mockResolvedValue(null),
      setDefaultTokenId: jest.fn().mockResolvedValue(undefined)
    }
  };
});

import { Token, CredentialError } from '@okta/auth-foundation/core';
import { ReactNativeTokenStorage } from 'src/Credential/TokenStorage';
import NativeTokenStorage from 'src/specs/NativeTokenStorageBridge';
import { mockTokenResponse } from '@repo/jest-helpers/react-native/helpers';


const makeTestToken = (id?: string, overrides = {}) => {
  return new Token(mockTokenResponse(id, overrides));
};

describe('ReactNativeTokenStorage', () => {
  let storage: ReactNativeTokenStorage;

  beforeEach(() => {
    storage = new ReactNativeTokenStorage();
  });

  describe('Default Token ID', () => {
    it('should load default token ID from native storage', async () => {
      const expectedId = 'default-token-id';
      (NativeTokenStorage.getDefaultTokenId as jest.Mock).mockResolvedValue(
        expectedId
      );

      const id = await storage.loadDefaultTokenId();

      expect(id).toBe(expectedId);
      expect(NativeTokenStorage.getDefaultTokenId).toHaveBeenCalled();
    });

    it('should cache default token ID after first load', async () => {
      const expectedId = 'cached-token-id';
      (NativeTokenStorage.getDefaultTokenId as jest.Mock).mockResolvedValue(
        expectedId
      );

      // First call
      await storage.loadDefaultTokenId();
      // Second call
      await storage.loadDefaultTokenId();

      // Should only call native once
      expect(NativeTokenStorage.getDefaultTokenId).toHaveBeenCalledTimes(1);
    });

    it('should return cached default token ID without calling native', async () => {
      const expectedId = 'cached-id';
      storage.defaultTokenId = expectedId;

      const id = await storage.loadDefaultTokenId();

      expect(id).toBe(expectedId);
      expect(NativeTokenStorage.getDefaultTokenId).not.toHaveBeenCalled();
    });

    it('should set default token ID in native storage', async () => {
      (NativeTokenStorage.setDefaultTokenId as jest.Mock).mockResolvedValue(
        undefined
      );

      const tokenId = 'new-default-id';
      await storage.setDefaultTokenId(tokenId);

      expect(NativeTokenStorage.setDefaultTokenId).toHaveBeenCalledWith(
        tokenId
      );
      expect(storage.defaultTokenId).toBe(tokenId);
    });

    it('should not call native if setting same default token ID', async () => {
      const tokenId = 'same-id';
      storage.defaultTokenId = tokenId;

      await storage.setDefaultTokenId(tokenId);

      expect(NativeTokenStorage.setDefaultTokenId).not.toHaveBeenCalled();
    });

    it('should emit default_changed event when setting default token ID', async () => {
      (NativeTokenStorage.setDefaultTokenId as jest.Mock).mockResolvedValue(
        undefined
      );
      const emitSpy = jest.spyOn(storage.emitter, 'emit');

      const tokenId = 'new-default-id';
      await storage.setDefaultTokenId(tokenId);

      expect(emitSpy).toHaveBeenCalledWith('default_changed', {
        storage,
        id: tokenId,
      });
    });

    it('should set default token ID to null', async () => {
      (NativeTokenStorage.setDefaultTokenId as jest.Mock).mockResolvedValue(
        undefined
      );
      storage.defaultTokenId = 'existing-id';

      await storage.setDefaultTokenId(null);

      expect(NativeTokenStorage.setDefaultTokenId).toHaveBeenCalledWith(null);
      expect(storage.defaultTokenId).toBeNull();
    });
  });

  describe('Token Operations', () => {
    it('should add a new token', async () => {
      (NativeTokenStorage.getAllTokenIds as jest.Mock).mockResolvedValue([]);
      (NativeTokenStorage.saveToken as jest.Mock).mockResolvedValue(undefined);
      (NativeTokenStorage.saveMetadata as jest.Mock).mockResolvedValue(
        undefined
      );
      (NativeTokenStorage.setDefaultTokenId as jest.Mock).mockResolvedValue(
        undefined
      );
      const emitSpy = jest.spyOn(storage.emitter, 'emit');

      const token = makeTestToken();
      await storage.add(token);

      expect(NativeTokenStorage.saveToken).toHaveBeenCalled();
      expect(NativeTokenStorage.saveMetadata).toHaveBeenCalled();
      expect(emitSpy).toHaveBeenCalledWith('token_added', {
        storage,
        id: token.id,
        token,
      });
    });

    it('should set first token as default', async () => {
      (NativeTokenStorage.getAllTokenIds as jest.Mock).mockResolvedValue([]);
      (NativeTokenStorage.saveToken as jest.Mock).mockResolvedValue(undefined);
      (NativeTokenStorage.saveMetadata as jest.Mock).mockResolvedValue(
        undefined
      );
      (NativeTokenStorage.setDefaultTokenId as jest.Mock).mockResolvedValue(
        undefined
      );

      const token = makeTestToken();
      await storage.add(token);

      expect(NativeTokenStorage.setDefaultTokenId).toHaveBeenCalledWith(
        token.id
      );
    });

    it('should throw error when adding duplicate token', async () => {
      (NativeTokenStorage.getAllTokenIds as jest.Mock).mockResolvedValue([
        'existing-token',
      ]);
      const tokenData = JSON.stringify({
        token: makeTestToken('existing-token').toJSON(),
        v: 1,
      });
      (NativeTokenStorage.getToken as jest.Mock).mockResolvedValue(tokenData);

      const token = makeTestToken('existing-token');

      await expect(storage.add(token)).rejects.toThrow(
        CredentialError
      );
    });

    it('should throw error when token and metadata IDs do not match', async () => {
      const token = makeTestToken();
      const metadata = Token.Metadata(makeTestToken());

      await expect(storage.add(token, metadata)).rejects.toThrow(
        'metadataConsistency'
      );
    });

    it('should retrieve a token by ID', async () => {
      const token = makeTestToken('test-id');
      const tokenData = JSON.stringify({
        token: token.toJSON(),
        v: 1,
      });
      (NativeTokenStorage.getToken as jest.Mock).mockResolvedValue(tokenData);
      (NativeTokenStorage.getMetadata as jest.Mock).mockResolvedValue(null);

      const retrieved = await storage.get('test-id');

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe('test-id');
      expect(retrieved?.accessToken).toBe(token.accessToken);
    });

    it('should return null for non-existent token', async () => {
      (NativeTokenStorage.getToken as jest.Mock).mockResolvedValue(null);

      const retrieved = await storage.get('non-existent');

      expect(retrieved).toBeNull();
    });

    it('should handle corrupted token data', async () => {
      (NativeTokenStorage.getToken as jest.Mock).mockResolvedValue(
        'invalid-json'
      );
      const removeTokenSpy = jest.spyOn(NativeTokenStorage, 'removeToken');
      removeTokenSpy.mockResolvedValue(undefined);

      const retrieved = await storage.get('corrupted-token');

      expect(retrieved).toBeNull();
      expect(removeTokenSpy).toHaveBeenCalledWith('corrupted-token');
    });

    it('should replace an existing token', async () => {
      const token = makeTestToken();
      (NativeTokenStorage.getToken as jest.Mock).mockResolvedValue(
        JSON.stringify({ token, v: 1 })
      );
      (NativeTokenStorage.getMetadata as jest.Mock).mockResolvedValue(
        JSON.stringify({ metadata: Token.Metadata(token), v: 1 })
      );
      const emitSpy = jest.spyOn(storage.emitter, 'emit');

      const replacementToken = makeTestToken(token.id);
      await storage.replace(replacementToken.id, replacementToken);

      expect(NativeTokenStorage.saveToken).toHaveBeenCalled();
      expect(emitSpy).toHaveBeenCalledWith('token_replaced', {
        storage,
        id: token.id,
        token: replacementToken,
      });
    });

    it('should throw error when replacing with mismatched IDs', async () => {
      const token = makeTestToken('token-id');

      await expect(storage.replace('different-id', token)).rejects.toThrow(
        'Token id mismatch'
      );
    });

    it('should remove a token', async () => {
      (NativeTokenStorage.removeToken as jest.Mock).mockResolvedValue(
        undefined
      );
      const emitSpy = jest.spyOn(storage.emitter, 'emit');

      await storage.remove('token-to-remove');

      expect(NativeTokenStorage.removeToken).toHaveBeenCalledWith(
        'token-to-remove'
      );
      expect(emitSpy).toHaveBeenCalledWith('token_removed', {
        storage,
        id: 'token-to-remove',
      });
    });

    it('should clear default token ID when removing active default', async () => {
      (NativeTokenStorage.removeToken as jest.Mock).mockResolvedValue(
        undefined
      );
      (NativeTokenStorage.setDefaultTokenId as jest.Mock).mockResolvedValue(
        undefined
      );
      storage.defaultTokenId = 'default-token';

      await storage.remove('default-token');

      expect(NativeTokenStorage.setDefaultTokenId).toHaveBeenCalledWith(null);
      expect(storage.defaultTokenId).toBeNull();
    });

    it('should not clear default token ID when removing non-default token', async () => {
      (NativeTokenStorage.removeToken as jest.Mock).mockResolvedValue(
        undefined
      );
      storage.defaultTokenId = 'default-token';

      await storage.remove('other-token');

      expect(NativeTokenStorage.setDefaultTokenId).not.toHaveBeenCalled();
    });
  });

  describe('Metadata Operations', () => {
    it('should retrieve metadata by token ID', async () => {
      const metadata = Token.Metadata(makeTestToken('test-id'));
      const metadataData = JSON.stringify({
        metadata,
        v: 1,
      });
      (NativeTokenStorage.getMetadata as jest.Mock).mockResolvedValue(
        metadataData
      );

      const retrieved = await storage.getMetadata('test-id');

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe('test-id');
    });

    it('should return null for non-existent metadata', async () => {
      (NativeTokenStorage.getMetadata as jest.Mock).mockResolvedValue(null);

      const retrieved = await storage.getMetadata('non-existent');

      expect(retrieved).toBeNull();
    });

    it('should handle corrupted metadata', async () => {
      (NativeTokenStorage.getMetadata as jest.Mock).mockResolvedValue(
        'invalid-json'
      );
      const removeTokenSpy = jest.spyOn(NativeTokenStorage, 'removeToken');
      removeTokenSpy.mockResolvedValue(undefined);

      const retrieved = await storage.getMetadata('corrupted-metadata');

      expect(retrieved).toBeNull();
      expect(removeTokenSpy).toHaveBeenCalledWith('corrupted-metadata');
    });

    it('should set metadata for a token', async () => {
      (NativeTokenStorage.saveMetadata as jest.Mock).mockResolvedValue(
        undefined
      );
      const emitSpy = jest.spyOn(storage.emitter, 'emit');
      const metadata = Token.Metadata(makeTestToken('test-id'));

      await storage.setMetadata(metadata);

      expect(NativeTokenStorage.saveMetadata).toHaveBeenCalled();
      expect(emitSpy).toHaveBeenCalledWith('metadata_updated', {
        storage,
        id: 'test-id',
        metadata,
      });
    });
  });

  describe('Token List Operations', () => {
    it('should get all token IDs', async () => {
      const tokenIds = ['token-1', 'token-2', 'token-3'];
      (NativeTokenStorage.getAllTokenIds as jest.Mock).mockResolvedValue(
        tokenIds
      );

      const ids = await storage.allIDs();

      expect(ids).toEqual(tokenIds);
      expect(NativeTokenStorage.getAllTokenIds).toHaveBeenCalled();
    });

    it('should return empty array when no tokens exist', async () => {
      (NativeTokenStorage.getAllTokenIds as jest.Mock).mockResolvedValue([]);

      const ids = await storage.allIDs();

      expect(ids).toEqual([]);
    });

    it('should clear all tokens', async () => {
      (NativeTokenStorage.clearTokens as jest.Mock).mockResolvedValue(
        undefined
      );
      const emitSpy = jest.spyOn(storage.emitter, 'emit');
      storage.defaultTokenId = 'some-default';

      await storage.clear();

      expect(NativeTokenStorage.clearTokens).toHaveBeenCalled();
      expect(storage.defaultTokenId).toBeNull();
      expect(emitSpy).toHaveBeenCalledWith('default_changed', {
        storage,
        id: null,
      });
    });
  });

  describe('Token Storage Version', () => {
    it('should warn when token storage version does not match', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const tokenData = JSON.stringify({
        token: makeTestToken('test-id').toJSON(),
        v: 99, // Different version
      });
      (NativeTokenStorage.getToken as jest.Mock).mockResolvedValue(tokenData);
      (NativeTokenStorage.getMetadata as jest.Mock).mockResolvedValue(null);

      await storage.get('test-id');

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Token storage version mismatch')
      );
      warnSpy.mockRestore();
    });

    it('should warn when metadata storage version does not match', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const metadataData = JSON.stringify({
        metadata: Token.Metadata(makeTestToken('test-id')),
        v: 99, // Different version
      });
      (NativeTokenStorage.getMetadata as jest.Mock).mockResolvedValue(
        metadataData
      );

      await storage.getMetadata('test-id');

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Token storage version mismatch')
      );
      warnSpy.mockRestore();
    });
  });

  describe('Event Emitter', () => {
    it('should have emitter property', () => {
      expect(storage.emitter).toBeDefined();
    });

    it('should emit events when tokens are added', async () => {
      (NativeTokenStorage.getToken as jest.Mock).mockResolvedValue(null);
      (NativeTokenStorage.getAllTokenIds as jest.Mock).mockResolvedValue([]);
      (NativeTokenStorage.saveToken as jest.Mock).mockResolvedValue(undefined);
      (NativeTokenStorage.saveMetadata as jest.Mock).mockResolvedValue(undefined);
      const listener = jest.fn();
      storage.emitter.on('token_added', listener);

      const token = makeTestToken('new-token');
      const metadata = Token.Metadata(token);
      await storage.add(token, metadata);

      expect(listener).toHaveBeenCalledWith({
        storage,
        id: 'new-token',
        token,
      });
    });
  });
});
