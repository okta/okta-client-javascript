import baseConfig from '@repo/rollup-config/sdk';
import ts from 'typescript';
import pkg from './package.json' with { type: 'json' };

const base = baseConfig(ts, pkg);

export default {
  ...base,
  input: 'src/index.ts',
  external: [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
    'react-native',
    'react',
    '@okta/auth-foundation/core',
    '@okta/auth-foundation/internal'
  ],
};
