import pkg from './package.json' with { type: 'json' };


const config = {
  displayName: 'node: @okta/auth-foundation',
  preset: '@repo/jest-helpers/node',
  globals: {
    __PKG_NAME__: pkg.name,
    __PKG_VERSION__: pkg.version,
  }
};

export default config;
