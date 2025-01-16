import { JestConfigWithTsJest } from 'ts-jest';

import * as pkg from './package.json';

const config: JestConfigWithTsJest = {
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
    // TODO: why is this required? yarn workspace and jest don't seem to get along?
    '^@okta/auth-foundation/client$': '<rootDir>/../auth-foundation/src/client.ts',
    '^@okta/auth-foundation/internal$': '<rootDir>/../auth-foundation/src/internal.ts',
    '^@okta/auth-foundation$': '<rootDir>/../auth-foundation/src/index.ts',
    '^@okta/spa-oauth2-flows$': '<rootDir>/../spa-oauth2-flows/src/index.ts',
  }
};

export default config;
