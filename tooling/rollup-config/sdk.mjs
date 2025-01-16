import cleanup from 'rollup-plugin-cleanup';
import typescript from 'rollup-plugin-typescript2';
import license from 'rollup-plugin-license';
import replace from '@rollup/plugin-replace';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


export default function (tsModule, packageJson) {
  return {
    input: 'src/index.ts',
    output: {
      dir: 'dist/esm',
      format: 'es',
      exports: 'named',
      sourcemap: true,
      preserveModules: true
    },
    plugins: [
      replace({
        __PKG_NAME__: JSON.stringify(packageJson.name),
        __PKG_VERSION__: JSON.stringify(packageJson.version),
        preventAssignment: true
      }),
      typescript({
        // eslint-disable-next-line node/no-unpublished-require
        typescript: tsModule,
        tsconfigOverride: {
          compilerOptions: {
            sourceMap: true,
            declaration: false
          }
        }
      }),
      cleanup({
        extensions: ['js', 'ts'],
        comments: 'none'
      }),
      license({
        banner: {
          content: {
            file: path.join(__dirname, '..', 'maintain-banners', 'license-template.txt'),
          }
        }
      }),
    ]
  }
}
