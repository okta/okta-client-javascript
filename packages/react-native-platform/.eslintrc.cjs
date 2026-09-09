module.exports = {
  extends: ["@repo/eslint-config/react-native-sdk.js"],
  root: true,
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['**/platform/defaults', '**/platform/defaults.ts', '**/platform/defaults.js'],
            message: "Importing from 'platform/defaults' is not allowed. Import `platform/Platform` and use `Platform.X` instead."
          },
        ]
      }
    ]
  }
};
