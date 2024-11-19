import baseConfig from '@repo/rollup-config/sdk';
import ts from 'typescript';
import pkg from './package.json' assert { type: "json" };

export default {
  ...baseConfig(ts),
  external: [
    ...Object.keys(pkg.peerDependencies),
    '@okta/auth-foundation/client'     // TODO: review this
  ],
};
