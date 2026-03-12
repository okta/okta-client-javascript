import pkg from './package.json' with { type: 'json' };


const config = {
  displayName: 'browser: @okta/oauth2-flows',
  preset: '@repo/jest-helpers/browser',
  globals: {
    __PKG_NAME__: pkg.name,
    __PKG_VERSION__: pkg.version,
  },
  moduleNameMapper: {
    '^@okta/auth-foundation/core$': '<rootDir>/../auth-foundation/src/core.ts',
    '^@okta/auth-foundation/internal$': '<rootDir>/../auth-foundation/src/internal.ts',
    '^@okta/auth-foundation$': '<rootDir>/../auth-foundation/src/index.ts'
  },
};

export default config;
