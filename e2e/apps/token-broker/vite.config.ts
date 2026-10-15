import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tsConfigPaths from 'vite-tsconfig-paths'
import { mockResourceServerPlugin } from '@repo/mock-resource-server/vite-plugin';

import envModule from '@repo/env';

envModule.setEnvironmentVarsFromTestEnv(__dirname);

const env = {};
// List of environment variables made available to the app
['ISSUER', 'SPA_CLIENT_ID', 'DPOP_CLIENT_ID', 'USE_DPOP'].forEach((key) => {
  if (!process.env[key]) {
    console.warn(`Environment variable ${key} should be set for development. See README.md`);
  }
  // https://github.com/vitejs/vite/issues/9167#issuecomment-1186546280
  env[`__${key}__`] = JSON.stringify(process.env[key]);
});

// https://vitejs.dev/config/
export default defineConfig(configEnv => ({
  server: {
    port: 8080,
  },
  build: {
    sourcemap: true,
  },
  preview: {
    port: 8080,
  },
  plugins: [
    react(),
    tsConfigPaths(),
    mockResourceServerPlugin() as Plugin,
  ],
  define: env,
}));
