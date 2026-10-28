import baseConfig from '@repo/rollup-config/sdk';
import ts from 'typescript';
import pkg from './package.json' with { type: 'json' };

const base = baseConfig(ts, pkg);

export default {
  ...base,
  input: [base.input, 'src/flows.ts', 'src/webview.tsx'],
  external: [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
    'react-native',
    'react',
    'react/jsx-runtime',
    '@okta/auth-foundation/core',
    '@okta/auth-foundation/internal'
  ],
};
