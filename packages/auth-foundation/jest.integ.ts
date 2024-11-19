import { JestConfigWithTsJest } from 'ts-jest';

const config: JestConfigWithTsJest = {
  displayName: '@okta/auth-foundation',
  preset: '@repo/jest-helpers/browser',
  // coveragePathIgnorePatterns: [
  //   '<rootDir>/src/constants.ts',
  //   '<rootDir>/src/types.ts',
  //   '<rootDir>/src/external.ts',
  //   '<rootDir>/src/index.ts',
  // ],
};

export default config;
