import baseConfig from '@repo/rollup-config/sdk';
import ts from 'typescript';
import pkg from './package.json' assert { type: "json" };

const base = baseConfig(ts);

export default {
  ...base,
  input: [
    base.input,
    'src/FetchClient/index.ts',
    'src/CredentialOrchestrator/index.ts'
  ],
  external: [
    ...Object.keys(pkg.peerDependencies),
    '@okta/auth-foundation/client'     // TODO: review this
  ],
};
