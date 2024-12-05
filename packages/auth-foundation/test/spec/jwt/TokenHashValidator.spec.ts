import { DefaultTokenHashValidator, JWT } from 'src/jwt';
import { JWTError } from 'src/errors';
import { b64u, buf } from 'src/crypto';

const writeJWT = (header: Record<string, unknown>, claims: Record<string, unknown>) => {
  const head = b64u(buf(JSON.stringify(header)));
  const body = b64u(buf(JSON.stringify(claims)));
  return `${head}.${body}.fakesignature`;
};

describe('TokenHashValidator', () => {
  const context: any = {};

  describe('accessToken', () => {

    beforeEach(() => {
      context.token = 'eyJraWQiOiJSTWtOZWNkaGd2awdawdTmQ0Q3VWcTM2QmpBNDVJZ3VsY2NawdaTN1pWUkVEb0VXcFZVIiwiYWxnIjoiUlMyNTYifQaaaaaaaaaaaa';
      context.header = {
        kid: 'somerandomid',
        alg: 'RS256'
      };
      context.payload = {
        at_hash: 'JhDrJ4NqbCAkRdWmStLwuQ'
      };
      context.validator = DefaultTokenHashValidator('accessToken');
    });

    it('should validate a valid `at_hash` value', async () => {
      const { header, payload, token, validator } = context;
      const idToken = new JWT(writeJWT(header, payload));

      await expect(validator.validate(token, idToken)).resolves.toBe(undefined);
    });

    it('should throw if `at_hash` is not valid', async () => {
      const { header, payload, token, validator } = context;

      const idToken1 = new JWT(writeJWT(header, payload));
      await expect(validator.validate('foobar', idToken1)).rejects.toThrow(new JWTError('Signature Invalid'));

      payload.at_hash = 'foobar';
      const idToken2 = new JWT(writeJWT(header, payload));
      await expect(validator.validate(token, idToken2)).rejects.toThrow(new JWTError('Signature Invalid'));
    });

    it('should throw if token is an empty string', async () => {
      const { header, payload, validator } = context;
      const idToken = new JWT(writeJWT(header, payload));

      await expect(validator.validate('', idToken)).rejects.toThrow(new TypeError('"token" cannot be an empty string'));
    });

    it('should throw if IDToken signing algorithm is not supported', async () => {
      const { header, payload, token, validator } = context;
      header.alg = 'HS256';
      const idToken = new JWT(writeJWT(header, payload));

      await expect(validator.validate(token, idToken)).rejects.toThrow(new JWTError('Unsupported Algorithm'));
    });
  });
});
