/**
 * @internal
 * 
 * Config
 * {
 *   name: name of test suite, used to isolate test suites
 *   app: monorepo package name (testapp/package.json .name)
 *   command: command to run to start the test app
 *   specs: array of spec files to run (relative to e2e/tests/specs)
 * }
 * 
 */

const config = [
  {
    name: 'redirect-model',
    app: '@repo/redirect-model-test-app',
    command: 'ci',
    specs: [
      'redirect-model/*'
    ]
  },
  {
    name: 'token-broker',
    app: '@repo/token-broker-test-app',
    command: 'ci',
    specs: [
      'token-broker/*'
    ]
  }
];

module.exports = {
  config
};
