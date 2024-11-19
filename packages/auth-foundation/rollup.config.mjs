import baseConfig from '@repo/rollup-config/sdk';
import ts from 'typescript';
import pkg from './package.json' assert { type: "json" };


const base = baseConfig(ts);

export default {
  ...base,
  input: [base.input, 'src/client.ts'],
  external: [...Object.keys(pkg.dependencies)],
};
