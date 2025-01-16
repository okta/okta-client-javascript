import {
  EVENT_ADDED,
  EVENT_DEFAULT_CHANGED,
  EVENT_REMOVED,
} from 'src/Credential/constants';
import { oauthClient, makeTestToken } from '../helpers/makeTestResource';
import { Credential } from 'src/Credential';

interface TestContext {
  [key:string]: any;
}

describe('Credential', () => {
  const context: TestContext = {};

  afterEach(() => {
    localStorage.clear();
    Credential.clear();
  });

  describe('instantiate', () => {
    it('should construct', () => {
      const token = makeTestToken();
      const cred = new Credential(token, oauthClient);
      expect(cred).toBeDefined();
      expect(cred).toBeInstanceOf(Credential);
    });

    // xit('should throw if Credential.init is called twice', () => {
    //   Credential.init();
    //   expect(() => Credential.init()).toThrow('configure cannot be called more than once');
    // });

    // xit('should throw if credentialDataSource is set twice', async () => {
    //   // Config.configure needs to be mocked to avoid throwing, otherwise this codeblock is never hit
    //   jest.resetModules();
    //   const Config = await import('src/Credential/config');
    //   jest.spyOn(Config, 'configure').mockImplementation(() => {});
    //   Credential = (await import('src/Credential/Credential')).default;

    //   Credential.init();
    //   expect(() => Credential.init()).toThrow('Final value: Credential.coordinator was already initialized');
    // });

    // xit('should throw if coordinator is set twice', async () => {
    //   // Config.configure AND get/set credentialDataSource needs to be mocked
    //   // to avoid throwing, otherwise this codeblock is never hit
    //   jest.resetModules();
    //   const Config = await import('src/Credential/config');
    //   const { DefaultCredentialDataSource } = (await import('src/Credential/CredentialDataSource'));
    //   const cDataSrc = new DefaultCredentialDataSource(Credential);
    //   jest.spyOn(Config, 'configure').mockImplementation(() => {});
    //   Credential = (await import('src/Credential/Credential')).default;
    //   jest.spyOn(Credential, 'credentialDataSource', 'set').mockImplementation(() =>{});
    //   jest.spyOn(Credential, 'credentialDataSource', 'get').mockReturnValue(cDataSrc);

    //   Credential.init();
    //   expect(() => Credential.init()).toThrow('Final value: Credential.coordinator was already initialized');
    // });

    // xit('should throw if members are accessed before init is called', () => {
    //   expect(() => Credential.default).toThrow('Credential.init was not called before usage');
    // });
  });

  describe('methods', () => {
    describe('statics', () => {
      describe('events/emitters', () => {
        it('should bind/remove listeners to events', () => {
          const onAdded1 = jest.fn();
          const onAdded2 = jest.fn();
          Credential.on(EVENT_ADDED, onAdded1);
          Credential.on(EVENT_ADDED, onAdded2);
          const onRemoved1 = jest.fn();
          const onRemoved2 = jest.fn();
          Credential.on(EVENT_REMOVED, onRemoved1);
          Credential.on(EVENT_REMOVED, onRemoved2);

          const token = makeTestToken();
          let cred = Credential.store(token);
          expect(onAdded1).toHaveBeenNthCalledWith(1, { credential: cred });
          expect(onAdded2).toHaveBeenNthCalledWith(1, { credential: cred });
          expect(onRemoved1).toHaveBeenCalledTimes(0);
          expect(onRemoved2).toHaveBeenCalledTimes(0);
          cred.remove();
          expect(onAdded1).toHaveBeenCalledTimes(1);
          expect(onAdded2).toHaveBeenCalledTimes(1);
          expect(onRemoved1).toHaveBeenNthCalledWith(1, { id: cred.id });
          expect(onRemoved2).toHaveBeenNthCalledWith(1, { id: cred.id });

          Credential.off(EVENT_ADDED);                  // removes all ADDED event listeners
          Credential.off(EVENT_REMOVED, onRemoved1);    // removes a specific event listener
          cred = Credential.store(token);
          expect(onAdded1).toHaveBeenCalledTimes(1);    // was removed, should not be called again
          expect(onAdded2).toHaveBeenCalledTimes(1);    // was removed, should not be called again
          cred.remove();
          expect(onRemoved1).toHaveBeenCalledTimes(1);  // was removed, should not be called again
          expect(onRemoved2).toHaveBeenNthCalledWith(2, { id: cred.id });
        });
      });
  
      describe('getters/setters', () => {
        it('default', () => {
          const onDefaultChanged = jest.fn();
          Credential.on(EVENT_DEFAULT_CHANGED, onDefaultChanged);
          const token = makeTestToken();
          const cred = Credential.store(token);
          expect(Credential.default).toEqual(cred);
          expect(onDefaultChanged).toHaveBeenCalledTimes(1);
          Credential.default = null;
          expect(Credential.default).toBeNull();
          expect(onDefaultChanged).toHaveBeenCalledTimes(2);
          Credential.default = cred;
          expect(Credential.default).toEqual(cred);
          expect(onDefaultChanged).toHaveBeenCalledTimes(3);
          cred.remove();
          expect(Credential.default).toBeNull();
          expect(onDefaultChanged).toHaveBeenCalledTimes(4);
        });

        // these tests would nearly idenitical. Including in the same test
        it('allIDs/size', () => {
          expect(Credential.allIDs).toEqual([]);
          expect(Credential.size).toEqual(0);
          const c1 = Credential.store(makeTestToken());
          const c2 = Credential.store(makeTestToken());
          const c3 = Credential.store(makeTestToken());
          expect(Credential.allIDs).toEqual([c1.id, c2.id, c3.id]);
          expect(Credential.size).toEqual(3);
          Credential.clear();
          expect(Credential.allIDs).toEqual([]);
          expect(Credential.size).toEqual(0);

          // no setters, should throw
          // @ts-expect-error confirms assignment logically won't work
          expect(() => Credential.allIDs = []).toThrow();
          // @ts-expect-error confirms assignment logically won't work
          expect(() => Credential.size = 5).toThrow();
        });
      });
  
      describe('credential/token methods', () => {
        it('store', () => {
          const token = makeTestToken();
          const cred = Credential.store(token, ['test']);
          expect(cred.id).toEqual(token.id);
          const storageItem = localStorage.getItem(`okta-token:v2:${cred.id}`);
          expect(storageItem).toBeDefined();
          expect(() => JSON.parse(storageItem!)).not.toThrow();
          expect(JSON.parse(storageItem!)).toMatchObject({
            token: {
              tokenType: 'Bearer',
              expiresIn: expect.any(Number),
              issuedAt: expect.any(Number),
              scopes: 'openid email profile offline_access',
              accessToken: cred.token.accessToken,
              idToken: cred.token?.idToken?.rawValue,
              refreshToken: cred.token.refreshToken,
              context: {
                issuer: 'https://foo.okta.com/',
                clientId: 'fake',
                scopes: 'openid email profile offline_access'
              }
            },
            metadata: {
              id: cred.id,
              tags: ['test'],
              scopes: ['openid', 'email', 'profile', 'offline_access']
            }
          });
        });

        it('with', () => {
          const token = makeTestToken();
          const cred = Credential.store(token);
          expect(Credential.with(token.id)).toEqual(cred);
          expect(Credential.with('foobar')).toBeNull();
        });

        it('find', () => {
          Credential.store(makeTestToken());
          const c1 = Credential.store(makeTestToken(), ['foo']);
          const c2 = Credential.store(makeTestToken(), ['foo']);
          const c3 = Credential.store(makeTestToken(), ['foo']);
          Credential.store(makeTestToken(), ['bar']);

          // test matcher pattern
          const matcher = meta => meta?.tags?.includes('foo');
          expect(Credential.find(matcher)).toEqual([c1, c2, c3]);
          expect(Credential.find(() => false)).toEqual([]);

          // test object shorthand
          expect(Credential.find({ tags: 'foo' })).toEqual([c1, c2, c3]);
          expect(Credential.find({ id: c2.id })).toEqual([c2]);
          expect(Credential.find({ id: c3.id, tags: 'foo' })).toEqual([c3]);
        });

        it('clear', () => {
          expect(Credential.size).toEqual(0);
          Credential.store(makeTestToken());
          Credential.store(makeTestToken());
          Credential.store(makeTestToken());
          expect(Credential.size).toEqual(3);
          Credential.clear();
          expect(Credential.size).toEqual(0);
        });

        it('isEqual', () => {
          const t1 = makeTestToken();
          const c1 = Credential.store(t1);
          const t2 = makeTestToken();
          const c2 = Credential.store(t2);
          expect(Credential.isEqual(c1, c1)).toBe(true);
          expect(Credential.isEqual(c1, c2)).toBe(false);
        });
      });
    });

    describe('member', () => {
      describe('getters/setters', () => {
        it('id', () => {
          const token = makeTestToken();
          const cred = Credential.store(token);
          expect(cred.id).toEqual(token.id);
        });

        describe('token', () => {
          it('get', () => {
            const token = makeTestToken();
            const cred = Credential.store(token);
            expect(cred.token).toEqual(token);
          });

          it('set', async () => {
            const { CredentialError } = (await import('src/Credential/errors'));

            const t1 = makeTestToken();
            const cred = Credential.store(t1);
            expect(cred.token).toEqual(t1);
            const t2 = makeTestToken();
            // @ts-expect-error confirms assignment logically won't work
            expect(() => cred.token = t2).toThrow(new CredentialError('Unrelated token. ids do not match'));
          });
        });

        it('tags', () => {
          let cred = Credential.store(makeTestToken(), ['test', 'foo']);
          expect(cred.tags).toEqual(['test', 'foo']);
          cred= Credential.store(makeTestToken());
          expect(cred.tags).toEqual([]);
        });
      });
  
      describe('credential/token methods', () => {
        it('setTags', () => {
          const cred = Credential.store(makeTestToken(), ['foo']);
          cred.setTags([]);
          expect(cred.tags).toEqual([]);
          cred.setTags(['test']);
          expect(cred.tags).toEqual(['test']);
          cred.setTags();
          expect(cred.tags).toEqual([]);
        });

        it('remove', () => {
          const c1 = Credential.store(makeTestToken());
          const c2 = Credential.store(makeTestToken());
          expect(Credential.size).toEqual(2);
          c1.remove();
          expect(Credential.with(c1.id)).toBe(null);
          expect(Credential.size).toEqual(1);
          c1.remove();   // remove c1 again, no ops
          expect(Credential.size).toEqual(1);
          c2.remove();
          expect(Credential.with(c2.id)).toBe(null);
          expect(Credential.size).toEqual(0);
        });

        it('getAuthHeader', () => {
          const bearerCred = Credential.store(makeTestToken());
          expect(bearerCred.getAuthHeader()).toEqual({
            Authorization: `Bearer ${bearerCred.token.accessToken}`
          });
          // TODO: update when dpop is implemented
          const dpopCred = Credential.store(makeTestToken({tokenType: 'DPoP'}));
          expect(dpopCred.getAuthHeader()).toEqual({
            Authorization: `Bearer ${dpopCred.token.accessToken}`
          });
        });

        it('authorize', async () => {
          // Bearer token strategy
          const bearerCred = Credential.store(makeTestToken());

          // called with fetch signature (url, RequestInit)
          const bc1 = await bearerCred.authorize('/foo', { headers: { foo: 'bar' }});
          expect(bc1).toBeInstanceOf(Request);
          expect(Object.fromEntries(bc1.headers.entries())).toEqual({
            foo: 'bar',
            authorization: `Bearer ${bearerCred.token.accessToken}`
          });

          // called with Request
          const req1 = new Request('/foo', { headers: { foo: 'bar' }});
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
          beforeEach(() => {
            const id = 'foobar';
            const token = makeTestToken(id);
            const cred = Credential.store(token);
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
              const cred = Credential.store(expiredToken);
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
          const c2 = Credential.store(t2);
          revokeSpy = jest.spyOn(c2.oauth2 as any, 'revoke').mockResolvedValue(undefined);
          rmSpy = jest.spyOn(c2, 'remove').mockImplementation(() => {});

          await c2.revoke('ACCESS');
          expect(revokeSpy).toHaveBeenLastCalledWith(c2.token, 'ACCESS');
          expect(rmSpy).toHaveBeenCalledTimes(1);   // should clear storage

          await c2.revoke('REFRESH');
          expect(revokeSpy).toHaveBeenLastCalledWith(c2.token, 'REFRESH');
          expect(rmSpy).toHaveBeenCalledTimes(1);   // should NOT clear storage
        });
  
        // xit('introspect', async () => {
        //   // TODO: test once method is implemented
        // });
  
        // xit('userInfo', async () => {
        //   // TODO: test once method is implemented
        // });
      });
    });
  });
});
