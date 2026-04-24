module.exports = {
  extends: ["@repo/eslint-config/sdk.js"],
  parser: "@typescript-eslint/parser",
  ignorePatterns: [
    'android/',
    'ios/',
    'react-native.config.js'
  ],
};
