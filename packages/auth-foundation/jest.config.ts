import { JestConfigWithTsJest } from 'ts-jest';

import * as pkg from './package.json';


const config: JestConfigWithTsJest = {
  displayName: '@okta/auth-foundation',
  preset: '@repo/jest-helpers/browser',
  globals: {
    __PKG_NAME__: pkg.name,
    __PKG_VERSION__: pkg.version,
  },
  // coveragePathIgnorePatterns: [
  //   '<rootDir>/src/constants.ts',
  //   '<rootDir>/src/types.ts',
  //   '<rootDir>/src/external.ts',
  //   '<rootDir>/src/index.ts',
  // ],
};

export default config;
