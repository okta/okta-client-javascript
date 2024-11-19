import { JWT } from 'src/jwt';
import { Token } from 'src/Token';
import { mockTokenResponse } from '@repo/jest-helpers/browser/helpers';


interface TestContext {
  [key:string]: any;
}

describe('Token', () => {
  const context: TestContext = {};

  beforeEach(() => {
    context.raw = mockTokenResponse();
    delete context.raw.issuedAt;
  });

  describe('instantiate', () => {
    // NOTE: tests seem to have been written based on flawed .mockReset() behavior
    // Ref: https://github.com/jestjs/jest/pull/14429 and https://github.com/jestjs/jest/issues/13916
    // consider re-introduction once migrated to jest 30 (once released)
    it('should return Token instance with generated id', () => {
      const { raw } = context;
      const { idToken, refreshToken, ...minimum } = raw;

      const randomValuesSpy = jest.spyOn(window.crypto, 'getRandomValues');

      const t1 = new Token(raw);
      expect(t1).toBeInstanceOf(Token);
      expect(t1.id).toBeDefined();
      expect(randomValuesSpy).toHaveBeenCalledTimes(1);
      // randomValuesSpy.mockReset();

      const t2 = new Token({...minimum, idToken});
      expect(t2).toBeInstanceOf(Token);
      expect(t2.id).toBeDefined();
      expect(t2.idToken).toBeInstanceOf(JWT);
      expect(randomValuesSpy).toHaveBeenCalledTimes(2);
      // randomValuesSpy.mockReset();

      const t3 = new Token({...minimum, refreshToken});
      expect(t3).toBeInstanceOf(Token);
      expect(t3.id).toBeDefined();
      expect(randomValuesSpy).toHaveBeenCalledTimes(3);
      // randomValuesSpy.mockReset();

      const t4 = new Token(minimum);
      expect(t4).toBeInstanceOf(Token);
      expect(t4.id).toBeDefined();
      expect(randomValuesSpy).toHaveBeenCalledTimes(4);
    });

    it('should return Token instance with provided id', () => {
      const { raw } = context;
      const { idToken, refreshToken, ...minimum } = raw;

      const id = window.crypto.randomUUID();

      const t1 = new Token({...raw, id});
      expect(t1).toBeInstanceOf(Token);
      expect(t1.id).toEqual(id);

      const t2 = new Token({...minimum, id, idToken});
      expect(t2).toBeInstanceOf(Token);
      expect(t2.id).toEqual(id);

      const t3 = new Token({...minimum, id, refreshToken});
      expect(t3).toBeInstanceOf(Token);
      expect(t3.id).toEqual(id);

      const t4 = new Token({...minimum, id, issuedAt: Date.now()});
      expect(t4).toBeInstanceOf(Token);
      expect(t4.id).toEqual(id);
    });
  });

  describe('statics', () => {
    it('.isEqual', () => {
      const t1 = new Token(mockTokenResponse());
      const t2 = new Token(mockTokenResponse());
      expect(Token.isEqual(t1, t1)).toBe(true);
      expect(Token.isEqual(t1, t2)).toBe(false);
    });
  });

  describe('getters/setters', () => {
    describe('get expiresAt', () => {
      it('returns Date object representing the datetime the token will expired', () => {
        const { raw } = context;
        const token = new Token(raw);
        const expiresAt = token.expiresAt;
        const issuedAt = token.issuedAt.valueOf();
        expect(expiresAt).toEqual(new Date(issuedAt + 300 * 1000)); // raw.expiresIn = 300
      });

      // TODO: rewrite this test when TimeCoordinator class is written
      // it('return expiresAt Date using custom nowProvider', () => {
      //   const { raw } = context;
      //   const fakeStamp = 1000;
      //   const nowProvider = jest.fn(() => fakeStamp);
      //   mocked.getConfig.mockReturnValueOnce({ nowProvider });
      //   const token = new Token(raw);
      //   const expiresAt = token.expiresAt;
      //   expect(expiresAt).toEqual(new Date(fakeStamp + 300 * 1000)); // raw.expiresIn = 300
      //   expect(nowProvider).toHaveBeenCalledTimes(1);
      // });

      it('should throw, no setter', () => {
        const { raw } = context;
        const token = new Token(raw);
        // @ts-expect-error
        expect(() => token.expiresAt = new Date())
          .toThrow('Cannot set property expiresAt of #<_a> which has only a getter');
      });
    });

    it('get isExpired', () => {
      const { raw } = context;
      const t1 = new Token(raw);
      expect(t1.isExpired).toBe(false);

      raw.issuedAt = 1000;
      const t2 = new Token(raw);
      expect(t2.isExpired).toBe(true);
    });

    describe('get scopes', () => {
      it('should return scopes are array of strings', () => {
        const { raw } = context;
        const t1 = new Token(raw);
        expect(t1.scope).toEqual('openid email profile offline_access');
        expect(t1.scopes).toEqual(['openid', 'email', 'profile', 'offline_access']);
      });
    });
  });

  describe('methods', () => {
    it('.toJSON', () => {
      const { raw } = context;
      const token = new Token(raw);
      const value = token.toJSON();
      expect(value).toMatchObject(raw);

      const { idToken, refreshToken, ...minimal } = raw;
      const t2 = new Token(minimal);
      expect(t2.toJSON()).toMatchObject(minimal);
    });

    it('.merge', () => {
      const { raw } = context;
      const { issuedAt, refreshToken, ...minimal } = raw;
      const token = new Token(raw);
      const newToken = new Token(minimal);
      expect(token.refreshToken).toEqual(refreshToken);
      expect(newToken.refreshToken).toEqual(undefined);
      const merged = newToken.merge(token);
      expect(merged.refreshToken).toEqual(refreshToken);
    });

    it('.authorize', async () => {
      // Bearer token strategy
      const t1 = new Token(mockTokenResponse());

      // called with fetch signature (url, RequestInit)
      const bc1 = await t1.authorize('/foo', { headers: { foo: 'bar' }});
      expect(bc1).toBeInstanceOf(Request);
      expect(Object.fromEntries(bc1.headers.entries())).toEqual({
        foo: 'bar',
        authorization: `Bearer ${t1.accessToken}`
      });

      // called with Request
      const req1 = new Request('/foo', { headers: { foo: 'bar' }});
      const bc2 = await t1.authorize(req1);
      expect(req1).toBeInstanceOf(Request);
      expect(bc2).toBe(req1);
      expect(Object.fromEntries(bc2.headers.entries())).toEqual({
        foo: 'bar',
        authorization: `Bearer ${t1.accessToken}`
      });

      // TODO: update when dpop is implemented
    });
  });
});
