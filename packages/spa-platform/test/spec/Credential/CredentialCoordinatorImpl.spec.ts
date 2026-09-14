import { CredentialCoordinatorImpl } from 'src/Credential/CredentialCoordinator';
import { Credential } from 'src/Credential';
import { BrowserTokenStorage } from 'src/Credential/TokenStorage';
import { makeTestToken } from '../../helpers/makeTestResource';


describe('CredentialCoordinatorImpl', () => {
  let cc: CredentialCoordinatorImpl;
  let channel: any;

  // simulates an incoming cross-tab BroadcastChannel message, since BroadcastChannel is mocked
  function receive (eventName: string, data: Record<string, any> = {}, source = 'other-tab') {
    return channel.onmessage({ data: { eventName, source, ...data } });
  }

  beforeEach(() => {
    // required to prevent open handles: `store()` creates an expiration timer (inherited from the base class)
    jest.useFakeTimers();
    cc = new CredentialCoordinatorImpl(Credential);
    Credential.coordinator = cc;
    channel = (cc as any).channel;
    (cc.tokenStorage as BrowserTokenStorage).encryptAtRest = false;   // disables crypto/indexedDB requirements
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Instantiate', () => {
    it('should construct', () => {
      expect(cc).toBeInstanceOf(CredentialCoordinatorImpl);
    });
  });

  describe('Broadcast local Credential* events cross-tab', () => {
    describe('Events', () => {
      test('credential_added', async () => {
        const cred = await cc.store(makeTestToken());
        expect(channel.postMessage).toHaveBeenCalledWith({
          eventName: 'credential_added',
          source: expect.any(String),
          id: cred.id
        });
      });

      test('credential_refreshed', async () => {
        const cred = await cc.store(makeTestToken());
        channel.postMessage.mockClear();

        const newToken = makeTestToken(cred.id);
        jest.spyOn(cred.oauth2, 'refresh').mockResolvedValue(newToken);
        // mocking `oauth2.refresh` means the `token_did_refresh` is not fired, emitting manually for test
        cred.oauth2.emitter.emit('token_did_refresh', { token: newToken });
        await cred.refresh();

        expect(channel.postMessage).toHaveBeenCalledWith({
          eventName: 'credential_refreshed',
          source: expect.any(String),
          id: cred.id
        });
      });

      test('credential_removed', async () => {
        const cred = await cc.store(makeTestToken());
        channel.postMessage.mockClear();

        await cc.remove(cred);

        expect(channel.postMessage).toHaveBeenCalledWith({
          eventName: 'credential_removed',
          source: expect.any(String),
          id: cred.id
        });
      });

      test('default_changed', async () => {
        const cred = await cc.store(makeTestToken());
        channel.postMessage.mockClear();

        await cc.setDefault(cred);

        expect(channel.postMessage).toHaveBeenCalledWith({
          eventName: 'default_changed',
          source: expect.any(String),
          id: cred.id
        });
      });

      test('metadata_updated', async () => {
        const cred = await cc.store(makeTestToken());

        await cred.setTags(['foo']);

        expect(channel.postMessage).toHaveBeenCalledWith({
          eventName: 'metadata_updated',
          source: expect.any(String),
          id: cred.id
        });
      });

      test('cleared', async () => {
        // does not broadcast when `localOnly` = true
        await cc.clear(true);
        expect(channel.postMessage).not.toHaveBeenCalledWith(expect.objectContaining({ eventName: 'cleared' }));

        // broadcasts by default (when `localOnly` = false)
        await cc.clear();
        expect(channel.postMessage).toHaveBeenCalledWith({ eventName: 'cleared', source: expect.any(String) });
      });
    });

    it('detaches broadcast listeners from a replaced tokenStorage', () => {
      const oldStorage = cc.tokenStorage;
      cc.tokenStorage = new BrowserTokenStorage();
      channel.postMessage.mockClear();

      oldStorage.emitter.emit('token_added', { storage: oldStorage, id: 'foo', token: makeTestToken() });

      expect(channel.postMessage).not.toHaveBeenCalled();
    });
  });

  describe('Receiving cross-tab messages', () => {
    describe('Events', () => {
      test('credential_added', async () => {
        const addedSpy = jest.fn();
        cc.emitter.on('credential_added', addedSpy);

        await receive('credential_added', { id: 'foo' });

        expect(addedSpy).toHaveBeenCalledWith({ id: 'foo' });
        expect(cc.credentialDataSource.hasCredential('foo')).toBe(false);
      });

      describe('credential_refreshed', () => {
        it('applies the freshly stored token and emits credential_refreshed when tokens differ', async () => {
          const cred = await cc.store(makeTestToken());
          const refreshed = makeTestToken(cred.id);
          await cc.tokenStorage.replace(cred.id, refreshed);   // simulates another tab's refresh landing in shared storage
          const refreshedSpy = jest.fn();
          cc.emitter.on('credential_refreshed', refreshedSpy);

          await receive('credential_refreshed', { id: cred.id });

          expect(cred.token).toEqual(refreshed);
          expect(refreshedSpy).toHaveBeenCalledWith({ credential: cred });
        });

        it('does not re-emit credential_refreshed if the stored token already matches', async () => {
          const cred = await cc.store(makeTestToken());
          const refreshedSpy = jest.fn();
          cc.emitter.on('credential_refreshed', refreshedSpy);

          await receive('credential_refreshed', { id: cred.id });   // storage already matches cred.token

          expect(refreshedSpy).not.toHaveBeenCalled();
        });
      });

      test('credential_removed', async () => {
        const removedSpy = jest.fn();
        cc.emitter.on('credential_removed', removedSpy);

        const cred = await cc.store(makeTestToken());
        expect(cc.credentialDataSource.hasCredential(cred)).toBe(true);

        // simulates removing Credential **not** present in `DataSource`
        receive('credential_removed', { id: 'never-seen' });
        expect(cc.credentialDataSource.hasCredential(cred)).toBe(true);
        expect(removedSpy).toHaveBeenLastCalledWith({ id: 'never-seen' });    // `credential_removed` is still emitted

        // simulates removing Credential which **is** present in `DataSource`
        await receive('credential_removed', { id: cred.id });
        expect(cc.credentialDataSource.hasCredential(cred)).toBe(false);
        expect(removedSpy).toHaveBeenLastCalledWith({ id: cred.id });
      });

      test('default_changed', async () => {
        const cred = await cc.store(makeTestToken());
        const defaultChangedSpy = jest.fn();
        cc.emitter.on('default_changed', defaultChangedSpy);

        await receive('default_changed', { id: cred.id });

        expect(defaultChangedSpy).toHaveBeenCalledWith({ storage: cc.tokenStorage, id: cred.id });
      });

      test('metadata_updated', async () => {
        const cred = await cc.store(makeTestToken(), ['foo']);
        const metadataSpy = jest.fn();
        cc.emitter.on('metadata_updated', metadataSpy);

        await receive('metadata_updated', { id: cred.id });

        expect(metadataSpy).toHaveBeenCalledWith(expect.objectContaining({ id: cred.id }));
      });

      test('cleared', async () => {
        await cc.store(makeTestToken());
        channel.postMessage.mockClear();
        const clearedSpy = jest.fn();
        cc.emitter.on('cleared', clearedSpy);

        await receive('cleared');

        expect(cc.size).toEqual(0);
        expect(clearedSpy).toHaveBeenCalled();
        expect(channel.postMessage).not.toHaveBeenCalledWith({ eventName: 'cleared', source: expect.any(String) });
      });
    });

    it('will not process messages it broadcasts', async () => {
      const ownId = (cc as any).id;
      const addedSpy = jest.fn();
      cc.emitter.on('credential_added', addedSpy);

      await receive('credential_added', { id: 'foo' }, ownId);

      expect(addedSpy).not.toHaveBeenCalled();
    });
  });

  describe('close', () => {
    it('closes the underlying BroadcastChannel', () => {
      cc.close();
      expect(channel.close).toHaveBeenCalledTimes(1);
    });
  });
});