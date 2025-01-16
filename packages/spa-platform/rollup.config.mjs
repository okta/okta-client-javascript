import baseConfig from '@repo/rollup-config/sdk';
import ts from 'typescript';
import pkg from './package.json' assert { type: "json" };

const base = baseConfig(ts, pkg);

export default {
  ...base,
  input: [
    base.input,
    'src/FetchClient/index.ts',
    'src/TokenOrchestrator/index.ts'
  ],
  external: [
    ...Object.keys(pkg.peerDependencies),
    '@okta/auth-foundation/client',
    '@okta/auth-foundation/internal',
  ],
};
