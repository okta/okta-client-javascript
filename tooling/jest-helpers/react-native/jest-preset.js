const { createJsWithBabelPreset } = require('ts-jest');
const path = require('path');


const jsWithBabelPreset = createJsWithBabelPreset({
  tsconfig: '<rootDir>/test/tsconfig.json',
  babelConfig: path.join(__dirname, 'babel.config.js')
});

// Jest doesn't follow a `preset` key nested inside a preset, so what `react-native`'s own Jest preset
// (`react-native/jest-preset.js`) configures is restated here: `setupFiles` mock the native bridge and core components,
// alongside `testEnvironment`, `haste` and `resolver`.
//
// These are module names, not absolute paths, on purpose. Jest resolves them from each project's `rootDir`, so they find
// the `react-native` that package tests against (the workspace root hoists a different version) regardless of the
// directory Jest was started from. Keep in sync with `react-native/jest-preset.js` when upgrading `react-native`.
module.exports = {
  haste: {
    defaultPlatform: 'ios',
    platforms: ['android', 'ios', 'native']
  },
  resolver: 'react-native/jest/resolver.js',
  setupFiles: ['react-native/jest/setup.js'],
  testEnvironment: 'react-native/jest/react-native-env.js',
  roots: ['<rootDir>'],
  globals: {
    __PKG_NAME__: 'PLACEHOLDER',
    __PKG_VERSION__: 'PLACEHOLDER'
  },
  // Jest uses the first matching pattern, in order. TS must go through `ts-jest`, so `react-native`'s own
  // `babel-jest` entry for `js|ts|tsx` is deliberately not carried over
  transform: {
    ...jsWithBabelPreset.transform,
    // `babelConfig` above only applies to TS files (via `ts-jest`). A bare `babel-jest` has no config, so give JS the same
    // one — otherwise Flow-typed sources allowed through `transformIgnorePatterns` (ex: `react-native/index.js`) fail to parse
    '^.+\\.jsx?$': ['babel-jest', { configFile: path.join(__dirname, 'babel.config.js') }],
    '^.+\\.(bmp|gif|jpg|jpeg|mp4|png|psd|svg|webp)$': 'react-native/jest/assetFileTransformer.js'
  },
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  restoreMocks: true,
  clearMocks: true,
  testMatch: [
    '**/test/spec/**/*.{js,jsx,ts,tsx}'
  ],
  // Don't transform node_modules - mock them instead via jest.mock() in setup
  // Exceptions: `@okta` (workspace TS source) and the same React Native packages `react-native`'s own preset
  // transforms (Flow syntax), plus `@testing-library/react-native` which ships untranspiled source
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@testing-library/react-native|@okta)/)'
  ],
  collectCoverageFrom: [
    'src/**/*.ts'
  ],
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  }
};
