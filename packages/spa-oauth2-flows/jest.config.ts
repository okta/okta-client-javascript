import { JestConfigWithTsJest } from 'ts-jest';

import * as pkg from './package.json';


const config: JestConfigWithTsJest = {
  displayName: '@okta/spa-oauth2-flows',
  preset: '@repo/jest-helpers/browser',
  // coveragePathIgnorePatterns: [
  //   '<rootDir>/src/constants.ts',
  //   '<rootDir>/src/types.ts',
  //   '<rootDir>/src/external.ts',
  //   '<rootDir>/src/index.ts',
  // ],
  globals: {
    __PKG_NAME__: pkg.name,
    __PKG_VERSION__: pkg.version,
  },
  moduleNameMapper: {
    // TODO: why is this required? yarn workspace and jest don't seem to get along?
    '^@okta/auth-foundation/client$': '<rootDir>/../auth-foundation/src/client.ts',
    '^@okta/auth-foundation/internal$': '<rootDir>/../auth-foundation/src/internal.ts',
    '^@okta/auth-foundation$': '<rootDir>/../auth-foundation/src/index.ts',
  },
};

export default config;
