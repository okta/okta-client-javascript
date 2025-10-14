// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');


module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    // `okta-client-javascript` dependencies because they will not be installed via npm, they are "installed" via a build.
    // Ignore them to avoid require builds to be ran before linting
    settings: {
      "import/core-modules": ["@okta/auth-foundation", "@okta/oauth2-flows"]
    }
  }
]);
