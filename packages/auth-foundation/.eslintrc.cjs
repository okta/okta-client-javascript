module.exports = {
  extends: ["@repo/eslint-config/sdk.js"],
  root: true,
  parser: "@typescript-eslint/parser",
  env: {
    'shared-node-browser': true
  },
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['**/platform/defaults', '**/platform/defaults.ts', '**/platform/defaults.js'],
            message: "Importing from 'platform/defaults' is not allowed. Import `platform/Platform` and use `Platform.X` instead."
          },
          {
            group: ['**/internal', '**/internal.ts', '**/internal.js'],
            message: "Do not import from 'internal'. This is an entrypoint-only file."
          }
        ]
      }
    ]
  }
};
