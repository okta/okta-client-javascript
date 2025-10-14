const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-';
export function randStr (len) {
  let str = '';
  for (let i=0; i<len; i++) {
    const idx = Math.floor(Math.random() * alphabet.length-1) + 1;
    str += alphabet[idx];
  }
  return str;
}

export function mockIDToken () {
  return [
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImltanVzdGtpZGRpbmcifQ',
    'eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0',
    'fakesignature'
  ].join('.');
};

export function mockTokenResponse (id?, overrides = {}) {
  const raw: any = {
    accessToken: randStr(10),
    idToken: mockIDToken(),
    refreshToken: randStr(10),
    scopes: 'openid email profile offline_access',
    expiresIn: 300,
    issuedAt: Date.now(),
    tokenType: 'Bearer'
  };

  if (id) {
    raw.id = id;
  }

  return {...raw, ...overrides};
};
