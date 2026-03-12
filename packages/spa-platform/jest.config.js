import pkg from './package.json' with { type: 'json' };


const config = {
  displayName: '@okta/spa-platform',
  preset: '@repo/jest-helpers/browser',
  globals: {
    __PKG_NAME__: pkg.name,
    __PKG_VERSION__: pkg.version,
  },
  coveragePathIgnorePatterns: [
    '<rootDir>/src/Credential/constants.ts',
    '<rootDir>/src/Credential/types.ts',
    '<rootDir>/src/Credential/index.ts',
    '<rootDir>/src/index.ts',
  ],
  moduleNameMapper: {
    // NOTE: '@okta/auth-foundation' maps to '@okta/auth-foundation/core' since every src file
    // imports from /core rather than the base entrypoint
    '^@okta/auth-foundation$': '<rootDir>/../auth-foundation/src/core.ts',
    '^@okta/auth-foundation/core$': '<rootDir>/../auth-foundation/src/core.ts',
    '^@okta/auth-foundation/internal$': '<rootDir>/../auth-foundation/src/internal.ts',
    '^@okta/oauth2-flows$': '<rootDir>/../oauth2-flows/src/index.ts',
  },
  setupFilesAfterEnv: [
    '<rootDir>/test/jest.setupAfterEnv.ts'
  ]
};

export default config;
