module.exports = {
  extends: ["@repo/eslint-config/sdk.js"],
  root: true,
  parser: "@typescript-eslint/parser",
  env: {
    browser: true,
    node: false
  },
};
