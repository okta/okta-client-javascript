import baseConfig from '@repo/rollup-config/sdk';
import ts from 'typescript';
import pkg from './package.json' with { type: 'json' };


const base = baseConfig(ts, pkg);

export default {
  ...base,
  input: [base.input, 'src/client.ts', 'src/internal.ts', 'src/MyAccountClient.ts'],
  external: [...Object.keys(pkg.dependencies)],
};
