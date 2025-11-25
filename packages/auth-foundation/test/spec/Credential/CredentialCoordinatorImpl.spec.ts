import { CredentialCoordinatorImpl } from 'src/Credential/CredentialCoordinator';
import { Credential } from 'src/Credential/Credential';
import { makeTestToken, oauthClient } from '../../helpers/makeTestResource';


interface TestContext {
  cc: CredentialCoordinatorImpl;
}

describe('CredentialCoordinatorImpl', () => {
  const context: any = {};

  beforeEach(() => {
    // required to prevent open handles
    // cc.store() creates a expiration timer which will remain open
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('instantiate', () => {
    it('should construct', () => {
      const cc = new CredentialCoordinatorImpl(Credential);
      expect(cc).toBeDefined();
      expect(cc).toBeInstanceOf(CredentialCoordinatorImpl);
    });
  });

  describe('methods', () => {
    beforeEach(() => {
      context.cc = new CredentialCoordinatorImpl(Credential);
    });

    describe('expire timeouts', () => {
      it('should fire event when token expires', async () => {
        const { cc } = context;
        const onExpired = jest.fn();
        cc.emitter.on('credential_expired', onExpired);
        const credential = await cc.store(makeTestToken());
        jest.runOnlyPendingTimers();
        expect(onExpired).toHaveBeenNthCalledWith(1, { credential });
      });
    });
  
    describe('getters/setters', () => {
      it('size', async () => {
        const { cc } = context;
        expect(cc.size).toEqual(0);
        expect(cc.credentialDataSource.size).toEqual(0);
        await cc.store(makeTestToken());
        expect(cc.size).toEqual(1);
        expect(cc.credentialDataSource.size).toEqual(1);
        await cc.store(makeTestToken());
        expect(cc.size).toEqual(2);
        expect(cc.credentialDataSource.size).toEqual(2);
        await cc.store(makeTestToken());
        expect(cc.size).toEqual(3);
        expect(cc.credentialDataSource.size).toEqual(3);
        await cc.clear();
        expect(cc.size).toEqual(0);
        expect(cc.credentialDataSource.size).toEqual(0);

        // no setter
        expect(() => cc.size = 5).toThrow();
      });
    });

    // NOTE: tests seem to have been written based on flawed .mockReset() behavior
    // Ref: https://github.com/jestjs/jest/pull/14429 and https://github.com/jestjs/jest/issues/13916
    // consider re-introduction once migrated to jest 30 (once released)
    it('getDefault / setDefault', async () => {
      const { cc } = context as TestContext;
      const onDefaultChanged = jest.fn();
      cc.emitter.on('default_changed', onDefaultChanged);
      const token = makeTestToken();
      const cred = await cc.store(token);

      expect(cc.tokenStorage.defaultTokenId).toEqual(cred.id);
      await expect(cc.getDefault()).resolves.toEqual(cred);   // tests getter
      expect(onDefaultChanged).toHaveBeenCalledTimes(1);

      cc.setDefault(null);   // sets default to null
      expect(cc.tokenStorage.defaultTokenId).toEqual(null);
      await expect(cc.getDefault()).resolves.toBeNull();    // tests getter
      expect(onDefaultChanged).toHaveBeenCalledTimes(2);
      expect(onDefaultChanged).toHaveBeenNthCalledWith(2, { id: null, storage: cc.tokenStorage });

      // onDefaultChanged.mockReset();
      // updateMetaSpy.mockReset();

      await expect(cc.getDefault()).resolves.toBeNull();
      cc.setDefault(cred);    // sets default to test credential
      expect(cc.tokenStorage.defaultTokenId).toEqual(cred.id);
      await expect(cc.getDefault()).resolves.toEqual(cred);   // tests getter
      expect(onDefaultChanged).toHaveBeenCalledTimes(3);
      expect(onDefaultChanged).toHaveBeenNthCalledWith(3, { id: cred.id, storage: cc.tokenStorage });
    });

    it('store', async () => {
      const { cc } = context;
      const onAdded = jest.fn();
      cc.emitter.on('credential_added', onAdded);
      const token = makeTestToken();
      const cred = await cc.store(token, ['test']);
      expect(cred).toBeInstanceOf(Credential);
      await expect(cc.tokenStorage.get(cred.id)).resolves.toBeDefined();
      await expect(cc.tokenStorage.get(cred.id)).resolves.toEqual(token);
      const { issuer, clientId, scopes } = oauthClient.configuration.toJSON();
      await expect(cc.tokenStorage.getMetadata(cred.id)).resolves.toEqual({
        id: cred.id,
        claims: expect.any(Object),
        issuer,
        clientId,
        scopes: (scopes as string).split(' '),
        tags: ['test']
      });
      expect(cc.tokenStorage.defaultTokenId).toEqual(cred.id);
      expect(cred.tags).toEqual(['test']);
      expect(onAdded).toHaveBeenCalledTimes(1);
      expect(onAdded).toHaveBeenCalledWith({ credential: cred, dataSource: cc.credentialDataSource });
    });

    it('with', async () => {
      const { cc } = context;
      const c1 = await cc.store(makeTestToken());
      const c2 = await cc.store(makeTestToken(), ['foo']);
      let value = await cc.with(c1.id);
      expect(value).toEqual(c1);
      expect(value.tags).toEqual([]);
      value = await cc.with(c2.id);
      expect(value).toEqual(c2);
      expect(value.tags).toEqual(['foo']);
      await expect(cc.with('foo')).resolves.toBeNull();
    });

    it('find', async () => {
      const { cc } = context;
      await cc.store(makeTestToken());
      const c2 = await cc.store(makeTestToken(), ['foo']);
      const c3 = await cc.store(makeTestToken(), ['foo']);
      const c4 = await cc.store(makeTestToken(), ['foo']);
      await cc.store(makeTestToken(), ['bar']);
      let value = await cc.find(meta => meta.tags?.includes('foo'));
      expect(value).toEqual([c2, c3, c4]);
      expect(value[0].tags).toEqual(['foo']);
    });

    it('remove', async () => {
      const { cc } = context;
      const onRemove = jest.fn();
      const onDefaultChanged = jest.fn();
      const c1 = await cc.store(makeTestToken());
      const c2 = await cc.store(makeTestToken());
      const c3 = await cc.store(makeTestToken());
      await cc.store(makeTestToken());  // token should remain in manager
      await cc.setDefault(c2);
      cc.emitter.on('credential_removed', onRemove);
      cc.emitter.on('default_changed', onDefaultChanged);  // bind listener after default is set to c2
      const clearExpireTimeoutSpy = jest.spyOn(CredentialCoordinatorImpl.prototype as any, 'clearExpireEventTimeout');

      await expect(cc.tokenStorage.get(c1.id)).resolves.toBeDefined();
      await expect(cc.tokenStorage.get(c2.id)).resolves.toBeDefined();
      await expect(cc.tokenStorage.get(c3.id)).resolves.toBeDefined();
      expect(cc.credentialDataSource.hasCredential(c1)).toEqual(true);
      expect(cc.credentialDataSource.hasCredential(c2)).toEqual(true);
      expect(cc.credentialDataSource.hasCredential(c3)).toEqual(true);
      expect(cc.size).toEqual(4);

      await cc.remove(c1);  // remove regular credential
      await expect(cc.tokenStorage.get(c1.id)).resolves.toBeNull();
      expect(cc.credentialDataSource.hasCredential(c1)).toEqual(false);
      expect(cc.size).toEqual(3);
      expect(clearExpireTimeoutSpy).toHaveBeenNthCalledWith(1, c1.id);
      expect(onRemove).toHaveBeenNthCalledWith(1, { id: c1.id, dataSource: cc.credentialDataSource });
      expect(onDefaultChanged).toHaveBeenCalledTimes(0);

      await cc.remove(c2);  // remove default credenital
      await expect(cc.tokenStorage.get(c2.id)).resolves.toBeNull();
      expect(cc.credentialDataSource.hasCredential(c2)).toEqual(false);
      expect(cc.size).toEqual(2);
      expect(clearExpireTimeoutSpy).toHaveBeenNthCalledWith(2, c2.id);
      expect(onRemove).toHaveBeenNthCalledWith(2, { id: c2.id, dataSource: cc.credentialDataSource });
      expect(onDefaultChanged).toHaveBeenNthCalledWith(1, { id: null, storage: cc.tokenStorage });
    });

    it('clear', async () => {
      const { cc } = context;
      await cc.store(makeTestToken());
      await cc.store(makeTestToken());
      await cc.store(makeTestToken());
      const clearExpireTimeoutSpy = jest.spyOn(CredentialCoordinatorImpl.prototype as any, 'clearExpireEventTimeout');

      expect(cc.size).toEqual(3);
      cc.clear();
      expect(cc.size).toEqual(0);
      await expect(cc.allIDs()).resolves.toEqual([]);
      expect(clearExpireTimeoutSpy).toHaveBeenCalledTimes(3);
    });

    it('allIDs', async () => {
      const { cc } = context;
      const creds = await Promise.all([
        cc.store(makeTestToken()),
        cc.store(makeTestToken()),
        cc.store(makeTestToken())
      ]);

      expect(cc.size).toEqual(3);
      await expect(cc.allIDs()).resolves.toEqual(creds.map(({ id }) => id ));
    });
  });
});
