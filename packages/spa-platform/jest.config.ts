import { JestConfigWithTsJest } from 'ts-jest';

const config: JestConfigWithTsJest = {
  displayName: '@okta/spa-platform',
  preset: '@repo/jest-helpers/browser',
  coveragePathIgnorePatterns: [
    '<rootDir>/src/Credential/constants.ts',
    '<rootDir>/src/Credential/types.ts',
    '<rootDir>/src/Credential/index.ts',
    '<rootDir>/src/index.ts',
  ],
  moduleNameMapper: {
    // TODO: why is this required? yarn workspace and jest don't seem to get along?
    '^@okta/auth-foundation/client$': '<rootDir>/../auth-foundation/src/client.ts',
    '^@okta/auth-foundation$': '<rootDir>/../auth-foundation/src/index.ts',
  }
};

export default config;
