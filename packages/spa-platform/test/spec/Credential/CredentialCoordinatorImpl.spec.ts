import { CredentialCoordinatorImpl } from 'src/Credential/CredentialCoordinator';
import { Credential } from 'src/Credential';
import { BrowserTokenStorage } from 'src/Credential/TokenStorage';
import { makeTestToken } from '../../helpers/makeTestResource';


// NOTE: this file only covers the platform-specific additions this class layers on top of
// `@okta/auth-foundation`'s base `CredentialCoordinatorImpl` (cross-tab BroadcastChannel sync).
// Behavior inherited unchanged from the base class (store/with/find/remove/clear/getDefault/
// setDefault/allIDs/expire timeouts) is already covered by auth-foundation's own
// CredentialCoordinatorImpl.spec.ts and isn't re-tested here.
describe('CredentialCoordinatorImpl (spa-platform)', () => {
  let cc: CredentialCoordinatorImpl;
  let channel: any;

  // simulates an incoming cross-tab BroadcastChannel message, since the mocked BroadcastChannel
  // (tooling/jest-helpers/browser/jest.setup.ts) never actually delivers `postMessage` calls anywhere
  function receive (eventName: string, data: Record<string, any> = {}, source = 'other-tab') {
    return channel.onmessage({ data: { eventName, source, ...data } });
  }

  beforeEach(() => {
    // required to prevent open handles: `store()` creates an expiration timer (inherited from the base class)
    jest.useFakeTimers();
    cc = new CredentialCoordinatorImpl(Credential);
    channel = (cc as any).channel;
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('instantiate', () => {
    it('should construct', () => {
      expect(cc).toBeInstanceOf(CredentialCoordinatorImpl);
    });
  });

  describe('broadcasting', () => {
    it('broadcasts only the id (not the token body) when a token is added', async () => {
      const cred = await cc.store(makeTestToken());
      expect(channel.postMessage).toHaveBeenCalledWith({
        eventName: 'credential_added',
        source: expect.any(String),
        id: cred.id
      });
    });

    it('broadcasts only the id when a credential is refreshed', async () => {
      const cred = await cc.store(makeTestToken());
      channel.postMessage.mockClear();

      jest.spyOn(cred.oauth2, 'refresh').mockResolvedValue(makeTestToken(cred.id));
      await cred.refresh();

      expect(channel.postMessage).toHaveBeenCalledWith({
        eventName: 'credential_refreshed',
        source: expect.any(String),
        id: cred.id
      });
    });

    it('broadcasts credential_removed when a credential is removed', async () => {
      const cred = await cc.store(makeTestToken());
      channel.postMessage.mockClear();

      await cc.remove(cred);

      expect(channel.postMessage).toHaveBeenCalledWith({
        eventName: 'credential_removed',
        source: expect.any(String),
        id: cred.id
      });
    });

    it('broadcasts default_changed', async () => {
      const cred = await cc.store(makeTestToken());
      channel.postMessage.mockClear();

      await cc.setDefault(cred);

      expect(channel.postMessage).toHaveBeenCalledWith({
        eventName: 'default_changed',
        source: expect.any(String),
        id: cred.id
      });
    });

    it('broadcasts metadata_updated', async () => {
      const cred = await cc.store(makeTestToken());
      channel.postMessage.mockClear();

      await cred.setTags(['foo']);

      expect(channel.postMessage).toHaveBeenCalledWith({
        eventName: 'metadata_updated',
        source: expect.any(String),
        id: cred.id
      });
    });

    it('broadcasts cleared when clear() is called without localOnly', async () => {
      await cc.clear();
      expect(channel.postMessage).toHaveBeenCalledWith({ eventName: 'cleared', source: expect.any(String) });
    });

    it('does not broadcast cleared when clear(true) (localOnly) is called', async () => {
      await cc.clear(true);
      expect(channel.postMessage).not.toHaveBeenCalledWith(expect.objectContaining({ eventName: 'cleared' }));
    });

    it('detaches broadcast listeners from a replaced tokenStorage', () => {
      const oldStorage = cc.tokenStorage;
      cc.tokenStorage = new BrowserTokenStorage();
      channel.postMessage.mockClear();

      oldStorage.emitter.emit('token_added', { storage: oldStorage, id: 'foo', token: makeTestToken() });

      expect(channel.postMessage).not.toHaveBeenCalled();
    });
  });

  describe('receiving cross-tab messages', () => {
    it('ignores messages broadcast by itself', async () => {
      const ownId = (cc as any).id;
      const addedSpy = jest.fn();
      cc.emitter.on('credential_added', addedSpy);

      await receive('credential_added', { id: 'foo' }, ownId);

      expect(addedSpy).not.toHaveBeenCalled();
    });

    it('constructs a credential from storage when credential_added is received, not from the message', async () => {
      const token = makeTestToken();
      await cc.tokenStorage.add(token);   // simulates another tab having already written to shared storage
      expect(cc.credentialDataSource.hasCredential(token)).toBe(false);

      await receive('credential_added', { id: token.id });

      expect(cc.credentialDataSource.hasCredential(token)).toBe(true);
    });

    it('does nothing if the token no longer exists in storage when credential_added is received', async () => {
      const credentialForSpy = jest.spyOn(cc.credentialDataSource, 'credentialFor');
      await receive('credential_added', { id: 'does-not-exist' });
      expect(credentialForSpy).not.toHaveBeenCalled();
    });

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

    it('removes the local credential when credential_removed is received', async () => {
      const cred = await cc.store(makeTestToken());
      expect(cc.credentialDataSource.hasCredential(cred)).toBe(true);

      await receive('credential_removed', { id: cred.id });

      expect(cc.credentialDataSource.hasCredential(cred)).toBe(false);
    });

    it('is a no-op removing an id this tab never cached', async () => {
      await expect(receive('credential_removed', { id: 'never-seen' })).resolves.not.toThrow();
    });

    it('applies default_changed from another tab', async () => {
      const cred = await cc.store(makeTestToken());
      const defaultChangedSpy = jest.fn();
      cc.emitter.on('default_changed', defaultChangedSpy);

      await receive('default_changed', { id: cred.id });

      expect(defaultChangedSpy).toHaveBeenCalledWith({ storage: cc.tokenStorage, id: cred.id });
    });

    it('applies metadata_updated from another tab by reading fresh metadata from storage', async () => {
      const cred = await cc.store(makeTestToken(), ['foo']);
      const metadataSpy = jest.fn();
      cc.emitter.on('metadata_updated', metadataSpy);

      await receive('metadata_updated', { id: cred.id });

      expect(metadataSpy).toHaveBeenCalledWith(expect.objectContaining({ id: cred.id }));
    });

    it('applies cleared from another tab without re-broadcasting', async () => {
      await cc.store(makeTestToken());
      channel.postMessage.mockClear();
      const clearedSpy = jest.fn();
      cc.emitter.on('cleared', clearedSpy);

      await receive('cleared');

      expect(cc.size).toEqual(0);
      expect(clearedSpy).toHaveBeenCalled();
      expect(channel.postMessage).not.toHaveBeenCalled();
    });
  });

  describe('close', () => {
    it('closes the underlying BroadcastChannel', () => {
      cc.close();
      expect(channel.close).toHaveBeenCalledTimes(1);
    });
  });
});