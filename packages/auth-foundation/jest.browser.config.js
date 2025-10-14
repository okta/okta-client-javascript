import pkg from './package.json' with { type: 'json' };


const config = {
  displayName: 'browser: @okta/auth-foundation',
  preset: '@repo/jest-helpers/browser',
  globals: {
    __PKG_NAME__: pkg.name,
    __PKG_VERSION__: pkg.version,
  },
};

export default config;
