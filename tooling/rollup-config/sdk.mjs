import cleanup from 'rollup-plugin-cleanup';
import typescript from 'rollup-plugin-typescript2';
import license from 'rollup-plugin-license';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


export default function (tsModule) {
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
