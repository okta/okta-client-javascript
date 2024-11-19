import { mockIDToken } from '@repo/jest-helpers/browser/helpers';
import { JWT } from 'src/jwt';

describe('JWT', () => {
  const context: any = {};

  describe('instantiate', () => {
    it('should construct', () => {
      const rawToken = mockIDToken();
      const jwt = new JWT(rawToken);
      expect(jwt).toBeInstanceOf(JWT);
      expect(jwt.rawValue).toEqual(rawToken);
    });

    it('should throw when JWT is invalid', () => {
      expect(() => new JWT('foo')).toThrow();
    });
  });

  describe('methods', () => {
    beforeEach(() => {
      context.raw = mockIDToken();
      context.jwt = new JWT(context.raw);
    });

    it('rawValue', () => {
      const { jwt, raw } = context;
      expect(jwt.rawValue).toEqual(raw);
    });

    it('claims', () => {
      const { jwt } = context;
      expect(jwt.claims).toEqual({
        admin: true,
        iat: 1516239022,
        name: 'John Doe',
        sub: '1234567890',
      });
    });

    it('payload', () => {
      const { jwt } = context;
      expect(jwt.payload).toEqual({
        admin: true,
        iat: 1516239022,
        name: 'John Doe',
        sub: '1234567890',
      });
    });

    it('header', () => {
      const { jwt } = context;
      expect(jwt.header).toEqual({
        alg: 'HS256',
        kid: 'imjustkidding',
        typ: 'JWT'
      });
    });

    // TODO: will add support for claims later
    xit('hasClaim', () => {
      const { jwt } = context;
      expect(jwt.hasClaim('name')).toEqual(true);
      expect(jwt.hasClaim('foo')).toEqual(false);
    });
  });
});
