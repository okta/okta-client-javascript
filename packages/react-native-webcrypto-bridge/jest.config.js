import pkg from './package.json' with { type: 'json' };


const config = {
  displayName: '@okta/react-native-webcrypto-bridge',
  preset: '@repo/jest-helpers/react-native',
  globals: {
    __PKG_NAME__: pkg.name,
    __PKG_VERSION__: pkg.version,
    __DEV__: true     // required for `react-native` itself
  },
  setupFiles: [
    '<rootDir>/test/jest.setup.ts'
  ]
};

export default config;
