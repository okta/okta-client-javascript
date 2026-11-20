module.exports = {
  extends: ["@repo/eslint-config/sdk.js"],
  root: true,
  parser: "@typescript-eslint/parser",
  env: {
    node: true,
    browser: false
  },
  rules: {
    "camelcase": 0,
    "no-restricted-imports": 0
  }
};
