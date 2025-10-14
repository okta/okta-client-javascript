import { Credential } from 'src/Credential';
import { OAuth2Error } from 'src/errors';
import { oauthClient, makeTestToken } from '../../helpers/makeTestResource';


interface TestContext {
  [key:string]: any;
}

describe('Credential', () => {
  const context: TestContext = {};

  afterEach(() => {
    Credential.clear();
  });

  describe('instantiate', () => {
    it('should construct', () => {
      const token = makeTestToken();
      const cred = new Credential(token, oauthClient);
      expect(cred).toBeDefined();
      expect(cred).toBeInstanceOf(Credential);
    });
  });

  describe('methods', () => {
    describe('statics', () => {
      describe('events/emitters', () => {
        it('should bind/remove listeners to events', async () => {
          const onAdded1 = jest.fn();
          const onAdded2 = jest.fn();
          Credential.on('credential_added', onAdded1);
          Credential.on('credential_added', onAdded2);
          const onRemoved1 = jest.fn();
          const onRemoved2 = jest.fn();
          Credential.on('credential_removed', onRemoved1);
          Credential.on('credential_removed', onRemoved2);

          const token = makeTestToken();
          let cred = await Credential.store(token);
          expect(onAdded1).toHaveBeenNthCalledWith(1, { credential: cred });
          expect(onAdded2).toHaveBeenNthCalledWith(1, { credential: cred });
          expect(onRemoved1).toHaveBeenCalledTimes(0);
          expect(onRemoved2).toHaveBeenCalledTimes(0);
          await cred.remove();
          expect(onAdded1).toHaveBeenCalledTimes(1);
          expect(onAdded2).toHaveBeenCalledTimes(1);
          expect(onRemoved1).toHaveBeenNthCalledWith(1, { id: cred.id });
          expect(onRemoved2).toHaveBeenNthCalledWith(1, { id: cred.id });

          Credential.off('credential_added');                  // removes all ADDED event listeners
          Credential.off('credential_removed', onRemoved1);    // removes a specific event listener
          cred = await Credential.store(token);
          expect(onAdded1).toHaveBeenCalledTimes(1);    // was removed, should not be called again
          expect(onAdded2).toHaveBeenCalledTimes(1);    // was removed, should not be called again
          await cred.remove();
          expect(onRemoved1).toHaveBeenCalledTimes(1);  // was removed, should not be called again
          expect(onRemoved2).toHaveBeenNthCalledWith(2, { id: cred.id });
        });
      });
  
      describe('getters/setters', () => {
        it('getDefault / setDefault', async () => {
          const onDefaultChanged = jest.fn();
          Credential.on('default_changed', onDefaultChanged);
          const token = makeTestToken();
          const cred = await Credential.store(token);
          await expect(Credential.getDefault()).resolves.toEqual(cred);
          expect(onDefaultChanged).toHaveBeenCalledTimes(1);
          Credential.setDefault(null);
          await expect(Credential.getDefault()).resolves.toBeNull();
          expect(onDefaultChanged).toHaveBeenCalledTimes(2);
          Credential.setDefault(cred);
          await expect(Credential.getDefault()).resolves.toEqual(cred);
          expect(onDefaultChanged).toHaveBeenCalledTimes(3);
          await cred.remove();
          await expect(Credential.getDefault()).resolves.toBeNull();
          expect(onDefaultChanged).toHaveBeenCalledTimes(4);
        });

        // these tests would nearly idenitical. Including in the same test
        it('allIDs/size', async () => {
          await expect(Credential.allIDs()).resolves.toEqual([]);
          expect(Credential.size).toEqual(0);
          const c1 = await Credential.store(makeTestToken());
          const c2 = await Credential.store(makeTestToken());
          const c3 = await Credential.store(makeTestToken());
          await expect(Credential.allIDs()).resolves.toEqual([c1.id, c2.id, c3.id]);
          expect(Credential.size).toEqual(3);
          await Credential.clear();
          await expect(Credential.allIDs()).resolves.toEqual([]);
          expect(Credential.size).toEqual(0);

          // no setters, should throw
          // @ts-expect-error confirms assignment logically won't work
          expect(() => Credential.size = 5).toThrow();
        });
      });
  
      describe('credential/token methods', () => {
        it('store', async () => {
          const storage =  (Credential as any).coordinator.tokenStorage;

          const tokenAddedListener = jest.fn();
          storage.emitter.on('token_added', tokenAddedListener);
          jest.spyOn(storage, 'add');

          const token = makeTestToken();
          const cred = await Credential.store(token, ['test']);
          expect(cred.id).toEqual(token.id);
          expect(storage.add).toHaveBeenCalledTimes(1);
          expect(storage.add).toHaveBeenCalledWith(token, expect.objectContaining({
            id: token.id,
            scopes: token.context.scopes,
            tags: ['test']
          }));
          expect(tokenAddedListener).toHaveBeenCalledTimes(1);
          expect(tokenAddedListener).toHaveBeenCalledWith({
            storage,
            id: token.id,
            token
          });
        });

        it('with', async () => {
          const token = makeTestToken();
          const cred = await Credential.store(token);
          await expect(Credential.with(token.id)).resolves.toEqual(cred);
          await expect(Credential.with('foobar')).resolves.toBeNull();
        });

        it('find', async () => {
          await Credential.store(makeTestToken());
          const c1 = await Credential.store(makeTestToken(), ['foo']);
          const c2 = await Credential.store(makeTestToken(), ['foo']);
          const c3 = await Credential.store(makeTestToken(), ['foo']);
          const c4 = await Credential.store(makeTestToken(), ['a', 'b', 'c']);
          const c5 = await Credential.store(makeTestToken(), ['a', 'b']);
          await Credential.store(makeTestToken(), ['bar']);

          // test matcher pattern
          const matcher = meta => meta?.tags?.includes('foo');
          await expect(Credential.find(matcher)).resolves.toEqual([c1, c2, c3]);
          await expect(Credential.find(() => false)).resolves.toEqual([]);
 
          // test object shorthand
          await expect(Credential.find({ tags: 'foo' })).resolves.toEqual([c1, c2, c3]);
          await expect(Credential.find({ id: c2.id })).resolves.toEqual([c2]);
          await expect(Credential.find({ id: c3.id, tags: 'foo' })).resolves.toEqual([c3]);
          await expect(Credential.find({ tags: ['a', 'b'] })).resolves.toEqual([c4, c5]);
          await expect(() => Credential.find({ id: ['a', 'b'] })).rejects.toThrow(TypeError);
          await expect(Credential.find({ tags: ['foo', 'bar'] })).resolves.toEqual([]);
        });

        it('clear', async () => {
          expect(Credential.size).toEqual(0);
          await Credential.store(makeTestToken());
          await Credential.store(makeTestToken());
          await Credential.store(makeTestToken());
          expect(Credential.size).toEqual(3);
          await Credential.clear();
          expect(Credential.size).toEqual(0);
        });

        it('isEqual', async () => {
          const t1 = makeTestToken();
          const c1 = await Credential.store(t1);
          const t2 = makeTestToken();
          const c2 = await Credential.store(t2);
          expect(Credential.isEqual(c1, c1)).toBe(true);
          expect(Credential.isEqual(c1, c2)).toBe(false);
        });
      });
    });

    describe('member', () => {
      describe('getters/setters', () => {
        it('id', async () => {
          const token = makeTestToken();
          const cred = await Credential.store(token);
          expect(cred.id).toEqual(token.id);
        });

        describe('token', () => {
          it('get', async () => {
            const token = makeTestToken();
            const cred = await Credential.store(token);
            expect(cred.token).toEqual(token);
          });

          it('set', async () => {
            const { CredentialError } = (await import('src/errors'));

            const t1 = makeTestToken();
            const cred = await Credential.store(t1);
            expect(cred.token).toEqual(t1);
            const t2 = makeTestToken();
            // @ts-expect-error confirms assignment logically won't work
            expect(() => cred.token = t2).toThrow(new CredentialError('Unrelated token. ids do not match'));
          });
        });

        it('tags', async () => {
          let cred: Credential | null = await Credential.store(makeTestToken(), ['test', 'foo']);
          expect(cred.tags).toEqual(['test', 'foo']);
          cred = await Credential.with(cred.id);      // .with() usage ensures metadata is loaded correctly from storage
          expect(cred?.tags).toEqual(['test', 'foo']);
          cred = await Credential.store(makeTestToken());
          expect(cred.tags).toEqual([]);
          cred = await Credential.with(cred.id);
          expect(cred?.tags).toEqual([]);
        });
      });
  
      describe('credential/token methods', () => {
        it('setTags', async () => {
          const onTagsUpdated = jest.fn();
          Credential.on('tags_updated', onTagsUpdated);

          const cred = await Credential.store(makeTestToken(), ['foo']);
          expect(cred.tags).toEqual(['foo']);
          expect(onTagsUpdated).not.toHaveBeenCalled();

          await cred.setTags([]);
          expect(cred.tags).toEqual([]);
          expect(onTagsUpdated).toHaveBeenLastCalledWith({ id: cred.id, tags: [] });

          await cred.setTags(['test']);
          expect(cred.tags).toEqual(['test']);
          expect(onTagsUpdated).toHaveBeenLastCalledWith({ id: cred.id, tags: ['test'] });

          await cred.setTags();
          expect(cred.tags).toEqual([]);
          expect(onTagsUpdated).toHaveBeenLastCalledWith({ id: cred.id, tags: [] });

          expect(onTagsUpdated).toHaveBeenCalledTimes(3);
        });

        it('remove', async () => {
          const c1 = await Credential.store(makeTestToken());
          const c2 = await Credential.store(makeTestToken());
          expect(Credential.size).toEqual(2);
          await c1.remove();
          await expect(Credential.with(c1.id)).resolves.toBe(null);
          expect(Credential.size).toEqual(1);
          await c1.remove();   // remove c1 again, no ops
          expect(Credential.size).toEqual(1);
          await c2.remove();
          await expect(Credential.with(c2.id)).resolves.toBe(null);
          expect(Credential.size).toEqual(0);
        });

        it('getAuthHeader', async () => {
          const bearerCred = await Credential.store(makeTestToken());
          expect(bearerCred.getAuthHeader()).toEqual({
            Authorization: `Bearer ${bearerCred.token.accessToken}`
          });
          // TODO: update when dpop is implemented
          const dpopCred = await Credential.store(makeTestToken({tokenType: 'DPoP'}));
          expect(dpopCred.getAuthHeader()).toEqual({
            Authorization: `Bearer ${dpopCred.token.accessToken}`
          });
        });

        it('authorize', async () => {
          // Bearer token strategy
          const bearerCred = await Credential.store(makeTestToken());

          // called with fetch signature (url, RequestInit)
          const bc1 = await bearerCred.authorize('http://localhost:8080/foo', { headers: { foo: 'bar' }});
          expect(bc1).toBeInstanceOf(Request);
          expect(Object.fromEntries(bc1.headers.entries())).toEqual({
            foo: 'bar',
            authorization: `Bearer ${bearerCred.token.accessToken}`
          });

          // called with Request
          const req1 = new Request('http://localhost:8080/foo', { headers: { foo: 'bar' }});
          const bc2 = await bearerCred.authorize(req1);
          expect(req1).toBeInstanceOf(Request);
          expect(bc2).toBe(req1);
          expect(Object.fromEntries(bc2.headers.entries())).toEqual({
            foo: 'bar',
            authorization: `Bearer ${bearerCred.token.accessToken}`
          });

          // TODO: update when dpop is implemented
        });
      });

      // TODO: test error scenarios
      describe('oauth methods', () => {
        describe('refresh', () => {
          beforeEach(async () => {
            const id = 'foobar';
            const token = makeTestToken(id);
            const cred = await Credential.store(token);
            context.id = id;
            context.token = token;
            context.cred = cred;
          });

          it('refresh', async () => {
            const { cred, id } = context;
            const rawToken = cred.token.toJSON();
            const refreshSpy = jest.spyOn(cred.oauth2, 'refresh').mockResolvedValue(makeTestToken(id));
            await cred.refresh();
            expect(refreshSpy).toHaveBeenCalledTimes(1);
            expect(cred.token.toJSON()).not.toEqual(rawToken);
          });

          describe('refreshIfNeeded', () => {
            it('token is not expired', async () => {
              const { cred, id } = context;
              const refreshSpy = jest.spyOn(cred.oauth2, 'refresh').mockResolvedValue(makeTestToken(id));
              await cred.refreshIfNeeded();
              expect(refreshSpy).not.toHaveBeenCalled();
            });

            it('token is expired', async () => {
              const id = 'bar';
              const expiredToken = makeTestToken(id, { issuedAt: Date.now() - 500000 });
              const cred = await Credential.store(expiredToken);
              const rawToken = cred.token.toJSON();
              const refreshSpy = jest.spyOn(cred.oauth2, 'refresh').mockResolvedValue(makeTestToken(id));
              await cred.refreshIfNeeded();
              expect(refreshSpy).toHaveBeenCalledTimes(1);
              expect(cred.token.toJSON()).not.toEqual(rawToken);
            });
          });
        });

        it('revoke', async () => {
          const { cred } = context;
          let revokeSpy = jest.spyOn(cred.oauth2, 'revoke').mockResolvedValue(undefined);
          let rmSpy = jest.spyOn(cred, 'remove').mockImplementation(() => {});

          await cred.revoke();
          expect(revokeSpy).toHaveBeenLastCalledWith(cred.token, 'ALL');
          expect(rmSpy).toHaveBeenCalledTimes(1);   // should clear storage

          await cred.revoke('ACCESS');
          expect(revokeSpy).toHaveBeenLastCalledWith(cred.token, 'ACCESS');
          expect(rmSpy).toHaveBeenCalledTimes(1);   // should NOT clear storage

          await cred.revoke('REFRESH');
          expect(revokeSpy).toHaveBeenLastCalledWith(cred.token, 'REFRESH');
          expect(rmSpy).toHaveBeenCalledTimes(2);   // should clear storage

          const t2 = makeTestToken('t2', { refreshToken: undefined });
          const c2 = await Credential.store(t2);
          revokeSpy = jest.spyOn(c2.oauth2 as any, 'revoke').mockResolvedValue(undefined);
          rmSpy = jest.spyOn(c2, 'remove').mockImplementation(() => Promise.resolve());

          await c2.revoke('ACCESS');
          expect(revokeSpy).toHaveBeenLastCalledWith(c2.token, 'ACCESS');
          expect(rmSpy).toHaveBeenCalledTimes(1);   // should clear storage

          await c2.revoke('REFRESH');
          expect(revokeSpy).toHaveBeenLastCalledWith(c2.token, 'REFRESH');
          expect(rmSpy).toHaveBeenCalledTimes(1);   // should NOT clear storage
        });
  
        it('introspect', async () => {
          const { cred } = context;
          const introspectSpy = jest.spyOn(cred.oauth2, 'introspect').mockResolvedValue({ active: true });
          
          await cred.introspect('access_token');
          expect(introspectSpy).toHaveBeenLastCalledWith(cred.token, 'access_token');

          await cred.introspect('id_token');
          expect(introspectSpy).toHaveBeenLastCalledWith(cred.token, 'id_token');

          await cred.introspect('refresh_token');
          expect(introspectSpy).toHaveBeenLastCalledWith(cred.token, 'refresh_token');

          introspectSpy.mockResolvedValue({ error: 'some error' });
          await expect(cred.introspect('access_token')).rejects.toThrow(new OAuth2Error('some error'));
        });
  
        it('userInfo', async () => {
          const { cred } = context;
          const userInfoSpy = jest.spyOn(cred.oauth2, 'userInfo').mockResolvedValue({ name: 'foo' });
          
          await cred.userInfo();
          expect(userInfoSpy).toHaveBeenLastCalledWith(cred.token);

          userInfoSpy.mockResolvedValue({ error: 'some error' });

          // mock is setup to return error, but cached value is returned
          await expect(cred.userInfo()).resolves.toEqual({ name: 'foo' });

          // skip cache, now the function will throw
          await expect(cred.userInfo(true)).rejects.toThrow(new OAuth2Error('some error'));
        });
      });
    });
  });
});
