import { mockIDToken } from '@repo/jest-helpers/browser/helpers';
import { JWT } from 'src/jwt';
import { JWTError } from 'src/errors';
import { b64u, buf } from 'src/crypto';
import { Platform } from 'src/platform/Platform';

const writeJWT = (claims: Record<string, unknown>) => {
  const head = b64u(buf(JSON.stringify({ alg: 'RS256', kid: 'somerandomid' })));
  const body = b64u(buf(JSON.stringify(claims)));
  return `${head}.${body}.fakesignature`;
};

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

  describe('time-based claims', () => {
    // epoch seconds, frozen via fake timers
    const now = 1700000000;

    beforeEach(() => {
      jest.useFakeTimers({ now: now * 1000 });
    });

    afterEach(() => {
      jest.useRealTimers();
      Platform.TimeCoordinator.clockTolerance = 0;
    });

    describe('isExpired / isValid', () => {
      it('is not expired when `exp` is in the future', () => {
        const jwt = new JWT(writeJWT({ exp: now + 300 }));
        expect(jwt.isExpired).toBe(false);
        expect(jwt.isValid).toBe(true);
      });

      it('is expired when `exp` is in the past', () => {
        const jwt = new JWT(writeJWT({ exp: now - 300 }));
        expect(jwt.isExpired).toBe(true);
        expect(jwt.isValid).toBe(false);
      });

      it('is expired when `exp` is now', () => {
        const jwt = new JWT(writeJWT({ exp: now }));
        expect(jwt.isExpired).toBe(true);
        expect(jwt.isValid).toBe(false);
      });

      it('is not expired when `exp` claim is absent', () => {
        const jwt = new JWT(writeJWT({ sub: 'foo' }));
        expect(jwt.isExpired).toBe(false);
        expect(jwt.isValid).toBe(true);
      });
    });

    describe('nbf', () => {
      it('constructs when `nbf` is in the past', () => {
        expect(() => new JWT(writeJWT({ nbf: now - 300 }))).not.toThrow();
      });

      it('constructs when `nbf` is now', () => {
        expect(() => new JWT(writeJWT({ nbf: now }))).not.toThrow();
      });

      it('throws when `nbf` is in the future', () => {
        expect(() => new JWT(writeJWT({ nbf: now + 300 })))
          .toThrow(new JWTError('`nbf` claim is unexpectedly in the future'));
      });

      it('applies `clockTolerance` leniently', () => {
        Platform.TimeCoordinator.clockTolerance = 60;
        expect(() => new JWT(writeJWT({ nbf: now + 30 }))).not.toThrow();
        expect(() => new JWT(writeJWT({ nbf: now + 90 }))).toThrow(JWTError);
      });
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
