module.exports = {
  extends: ["@repo/eslint-config/sdk.js"],
  root: true,
  parser: "@typescript-eslint/parser",
  env: {
    'react-native/react-native': true
  },
  plugins: ['react', 'react-native'],
  rules: {
    'react-native/no-unused-styles': 'warn',
    'react-native/no-inline-styles': 'warn',
    'react-native/no-color-literals': 'warn',
  },
  settings: {
    react: {
      version: 'detect'
    }
  }
};
