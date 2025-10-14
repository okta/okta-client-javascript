import baseConfig from '@repo/rollup-config/sdk';
import ts from 'typescript';
import pkg from './package.json' with { type: 'json' };

const base = baseConfig(ts, pkg);

export default {
  ...base,
  input: [
    base.input,
    'src/FetchClient/index.ts',
    'src/orchestrators/index.ts',
    'src/flows/index.ts'
  ],
  external: [
    ...Object.keys(pkg.peerDependencies),
    '@okta/auth-foundation/client',
    '@okta/auth-foundation/internal',
  ],
};
