import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pkg from './package.json' with { type: 'json' };

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config = {
  displayName: 'integration: @okta/oauth2-flows',
  preset: '@repo/jest-helpers/node',
  globals: {
    __PKG_NAME__: pkg.name,
    __PKG_VERSION__: pkg.version,
  },
  moduleNameMapper: {
    '^@okta/auth-foundation/core$': '<rootDir>/../auth-foundation/src/core.ts',
    '^@okta/auth-foundation/internal$': '<rootDir>/../auth-foundation/src/internal.ts',
    '^@okta/auth-foundation$': '<rootDir>/../auth-foundation/src/index.ts',
  },
  // unlike the unit test projects, this only runs `test/integration/*.integration.spec.ts` files,
  // and does NOT install the fetch-blocking `setupFiles` from the preset (see `test/integration/jest.setup.ts`)
  testMatch: ['<rootDir>/test/integration/**/*.integration.spec.ts'],
  setupFiles: [path.join(__dirname, 'test/integration/jest.setup.ts')],
};

export default config;
