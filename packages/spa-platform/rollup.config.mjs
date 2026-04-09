import baseConfig from '@repo/rollup-config/sdk';
import ts from 'typescript';
import pkg from './package.json' with { type: 'json' };

const base = baseConfig(ts, pkg);

export default {
  ...base,
  input: [base.input, 'src/flows.ts'],
  external: [
    ...Object.keys(pkg.peerDependencies),
    '@okta/auth-foundation/core',
    '@okta/auth-foundation/internal',
  ],
};
