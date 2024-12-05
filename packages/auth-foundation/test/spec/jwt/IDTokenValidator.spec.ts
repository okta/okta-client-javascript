import { DefaultIDTokenValidator, IDTokenValidator, JWT } from 'src/jwt';
import { JWTError } from 'src/errors';
import { b64u, buf } from 'src/crypto';

const writeJWT = (header: Record<string, unknown>, claims: Record<string, unknown>) => {
  const head = b64u(buf(JSON.stringify(header)));
  const body = b64u(buf(JSON.stringify(claims)));
  return `${head}.${body}.fakesignature`;
};

// wrapper around `DefaultIDTokenValidator.validate` with default param values
const defaultParams = {
  issuer: new URL('https://fake.okta.com'),
  clientId: 'someclientid',
  context: { supportedAlgs: ['RS256'] }
};
const validate = (
  jwt: JWT,
  params: { issuer?: URL, clientId?: string, context?: Record<string, unknown> } = {}
): void => {
  const { issuer, clientId, context } = {...defaultParams, ...params};
  return DefaultIDTokenValidator.validate(jwt, issuer, clientId, context);
};

describe('DefaultIDTokenValidator', () => {
  const context: any = {};

  beforeEach(() => {
    const header = {
      kid: 'somerandomid',
      alg: 'RS256'
    };

    const now = Date.now() / 1000;

    const payload = {
      sub: 'someclientid',
      aud: 'someclientid',
      ver: 1,
      iss: 'https://fake.okta.com',
      iat: now,
      exp: now + 300,
      nonce: 'nonceuponatime'
    };

    context.header = header;
    context.payload = payload;
  });

  it('validates a valid ID Token', () => {
    const { header, payload } = context;
    const jwt = new JWT(writeJWT(header, payload));

    expect(() => validate(jwt)).not.toThrow();
  });

  it('will run a subset of validation checks when configured', () => {
    const { header, payload } = context;
    const jwt = new JWT(writeJWT(header, payload));

    const allChecks = DefaultIDTokenValidator.checks;
    const [_, ...otherChecks] = allChecks;
    DefaultIDTokenValidator.checks = otherChecks;

    expect(() => validate(jwt, { issuer: new URL('https://foo.okta.com') }))
      .not.toThrow(new JWTError('Invalid issuer (iss) claim'));

    DefaultIDTokenValidator.checks = allChecks;   // resets validation checks
    expect(() => validate(jwt, { issuer: new URL('https://foo.okta.com') }))
      .toThrow(new JWTError('Invalid issuer (iss) claim'));
  });

  describe('throws when ID Token contains inconsistent claim', () => {
    it('issuer (iss)', () => {
      const { header, payload } = context;
      const jwt1 = new JWT(writeJWT(header, payload));
      expect(() => validate(jwt1, { issuer: new URL('https://foo.okta.com') }))
        .toThrow(new JWTError('Invalid issuer (iss) claim'));

      payload.iss = 'https://foo.okta.com';
      const jwt2 = new JWT(writeJWT(header, payload));
      expect(() => validate(jwt2)).toThrow(new JWTError('Invalid issuer (iss) claim'));
    });

    it('audience (aud)', () => {
      const { header, payload } = context;
      const jwt1 = new JWT(writeJWT(header, payload));
      expect(() => validate(jwt1, { clientId: 'foobar' }))
        .toThrow(new JWTError('invalid audience (aud) claim'));

      payload.aud = 'foobar';
      const jwt2 = new JWT(writeJWT(header, payload));
      expect(() => validate(jwt2)).toThrow(new JWTError('invalid audience (aud) claim'));
    });

    it('scheme (iss)', () => {
      const { header, payload } = context;
      payload.iss = 'http://fake.okta.com';
      const jwt = new JWT(writeJWT(header, payload));
      expect(() => validate(jwt, { issuer: new URL('http://fake.okta.com') }))
        .toThrow(new JWTError('issuer (iss) claim requires HTTPS'));
    });

    it('algorithm (header.alg)', () => {
      const { header, payload } = context;
      const jwt1 = new JWT(writeJWT(header, payload));
      expect(() => validate(jwt1, { context: { supportedAlgs: [] } })).not.toThrow();
      expect(() => validate(jwt1, { context: {} })).not.toThrow();
      expect(() => validate(jwt1, { context: undefined })).not.toThrow();

      expect(() => validate(jwt1, { context: { supportedAlgs: ['HS256'] } }))
        .toThrow(new JWTError('Unsupported jwt signing algorithm'));

      header.alg = 'HS256';
      const jwt2 = new JWT(writeJWT(header, payload));
      expect(() => validate(jwt2)).toThrow(new JWTError('Unsupported jwt signing algorithm'));
      expect(() => validate(jwt2, { context: { supportedAlgs: ['RS256', 'HS256'] } })).not.toThrow();
    });

    it('expirationTime (exp)', () => {
      const { header, payload } = context;
      payload.iat -= 600;   // required to avoid different validation error
      payload.exp -= 600;
      const jwt = new JWT(writeJWT(header, payload));
      expect(() => validate(jwt)).toThrow(new JWTError('jwt has expired'));
    });

    it('issuedAtTime', () => {
      const { header, payload } = context;
      payload.iat -= 600;
      const jwt = new JWT(writeJWT(header, payload));
      expect(() => validate(jwt)).toThrow(new JWTError('issuedAtTime (iat) exceeds grace interval'));

      const graceInterval = DefaultIDTokenValidator.issuedAtGraceInterval;
      DefaultIDTokenValidator.issuedAtGraceInterval = 1000;
      expect(() => validate(jwt)).not.toThrow(new JWTError('issuedAtTime (iat) exceeds grace interval'));
      DefaultIDTokenValidator.issuedAtGraceInterval = graceInterval;    // restore graceInterval
    });

    it('nonce', () => {
      const { header, payload } = context;
      const jwt = new JWT(writeJWT(header, payload));
      expect(() => validate(jwt)).not.toThrow(new JWTError('nonce mismatch'));
      expect(() => validate(jwt, { context: { nonce: 'foo' } })).toThrow(new JWTError('nonce mismatch'));
      expect(() => validate(jwt, { context: { nonce: 'nonceuponatime' } })).not.toThrow(new JWTError('nonce mismatch'));
    });

    it('maxAge', () => {
      const { header, payload } = context;
      const jwt1 = new JWT(writeJWT(header, payload));
      expect(() => validate(jwt1)).not.toThrow();
      expect(() => validate(jwt1, { context: { maxAge: 300 } })).toThrow(new JWTError('Invalid Authentication Time'));

      payload.auth_time = 1 / 0;
      const jwt2 = new JWT(writeJWT(header, payload));
      expect(() => validate(jwt2, { context: { maxAge: 300 } })).toThrow(new JWTError('Invalid Authentication Time'));

      payload.auth_time = 'foobar';
      const jwt3 = new JWT(writeJWT(header, payload));
      expect(() => validate(jwt3, { context: { maxAge: 300 } })).toThrow(new JWTError('Invalid Authentication Time'));

      payload.auth_time = payload.iat - 300;
      const jwt4 = new JWT(writeJWT(header, payload));
      expect(() => validate(jwt4, { context: { maxAge: 300 } })).toThrow(new JWTError('exceeds maxAge'));

      delete payload.iat;
      DefaultIDTokenValidator.checks = ['maxAge'];    // isolates `maxAge` for test to avoid failing other validations
      const jwt5 = new JWT(writeJWT(header, payload));
      expect(() => validate(jwt5, { context: { maxAge: 300 } })).toThrow(new JWTError('exceeds maxAge'));
      DefaultIDTokenValidator.checks = [...IDTokenValidator.allValidationChecks];   // resets validation checks
    });

    it('subject', () => {
      const { header, payload } = context;
      payload.sub = '';
      const jwt1 = new JWT(writeJWT(header, payload));
      expect(() => validate(jwt1)).toThrow(new JWTError('Invalid subject (sub) claim'));

      delete payload.sub;
      const jwt2 = new JWT(writeJWT(header, payload));
      expect(() => validate(jwt2)).not.toThrow(new JWTError('Invalid subject (sub) claim'));
    });
  });
});
