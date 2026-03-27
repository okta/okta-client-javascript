const { createJsWithBabelPreset } = require('ts-jest');
const path = require('path');


const jsWithBabelPreset = createJsWithBabelPreset({
  tsconfig: '<rootDir>/test/tsconfig.json',
  babelConfig: path.join(__dirname, 'babel.config.js')
});

module.exports = {
  roots: ['<rootDir>'],
  preset: 'react-native',
  globals: {
    __PKG_NAME__: 'PLACEHOLDER',
    __PKG_VERSION__: 'PLACEHOLDER'
  },
  transform: jsWithBabelPreset.transform,
  extensionsToTreatAsEsm: ['.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  restoreMocks: true,
  clearMocks: true,
  testMatch: [
    '**/test/spec/**/*.{js,ts}'
  ],
  // Don't transform node_modules - mock them instead via jest.mock() in setup
  transformIgnorePatterns: [
    'node_modules/(?!(@okta)/)'
  ],
  collectCoverageFrom: [
    'src/**/*.ts'
  ],
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  }
};
