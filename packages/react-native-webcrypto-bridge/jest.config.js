import { createJsWithBabelPreset } from 'ts-jest';
import pkg from './package.json' with { type: 'json' };


const jsWithBabelPreset = createJsWithBabelPreset({
  tsconfig: '<rootDir>/test/tsconfig.json',
  babelConfig: true,
});

const config = {
  displayName: '@okta/react-native-webcrypto-bridge',
  preset: 'react-native',
  globals: {
    __PKG_NAME__: pkg.name,
    __PKG_VERSION__: pkg.version,
  },
  transform: jsWithBabelPreset.transform,
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  setupFiles: ['<rootDir>/test/jest.setup.js'],
  collectCoverageFrom: [
    'src/**/*.ts'
  ],
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1'
  }
};

export default config;
