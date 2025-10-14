import pkg from './package.json' with { type: 'json' };


const config = {
  displayName: 'browser: @okta/oauth2-flows',
  preset: '@repo/jest-helpers/browser',
  globals: {
    __PKG_NAME__: pkg.name,
    __PKG_VERSION__: pkg.version,
  },
  moduleNameMapper: {
    '^@okta/auth-foundation/client$': '<rootDir>/../auth-foundation/src/client.ts',
    '^@okta/auth-foundation/internal$': '<rootDir>/../auth-foundation/src/internal.ts',
    '^@okta/auth-foundation$': '<rootDir>/../auth-foundation/src/index.ts'
  },
};

export default config;
