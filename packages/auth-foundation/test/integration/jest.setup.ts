import { setEnvironmentVarsFromTestEnv } from '@repo/env';

// imports env vars from `testenv`. Disables console.log temporary to reduce noise
const log = console.log;
console.log = () => {};
setEnvironmentVarsFromTestEnv();
console.log = log;

// resets the `global.fetch` mock from `tooling/jest-helpers/node/jest.setup.ts` (via node preset)
global.fetch = global.platformFetch;
