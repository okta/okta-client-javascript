import pkg from './package.json' with { type: 'json' };


const config = {
  displayName: '@okta/react-native-platform',
  preset: '@repo/jest-helpers/react-native',
  globals: {
    __PKG_NAME__: pkg.name,
    __PKG_VERSION__: pkg.version,
    __DEV__: true     // required for `react-native` itself
  },
  // setupFiles: [
  //   '<rootDir>/test/jest.setup.ts'
  // ],
  setupFilesAfterEnv: [
    '<rootDir>/test/jest.setupAfterEnv.ts'
  ],
  moduleNameMapper: {
    // '^src/(.*)$': '<rootDir>/src/$1',
    // NOTE: '@okta/auth-foundation' maps to '@okta/auth-foundation/core' since every src file
    // imports from /core rather than the base entrypoint
    '^@okta/auth-foundation$': '<rootDir>/../auth-foundation/src/core.ts',
    '^@okta/auth-foundation/core$': '<rootDir>/../auth-foundation/src/core.ts',
    '^@okta/auth-foundation/internal$': '<rootDir>/../auth-foundation/src/internal.ts',
    '^@okta/react-native-webcrypto-bridge$': '<rootDir>/../react-native-webcrypto-bridge/src/index.ts',
  }
};

export default config;
