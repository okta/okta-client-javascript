/** 
 * @module Core
 */

export * from './core.ts';

import { Platform } from './platform/Platform.ts';

// eslint-disable-next-line no-restricted-syntax
import { __internalTimeCoordinator } from './utils/TimeCoordinator.ts';
// eslint-disable-next-line no-restricted-syntax
import { __internalDPoPSigningAuthority } from './oauth2/dpop/index.ts';

// NOTE: any singleton added to the Platform will need to be added to `test/jest.setupAfterEnv.ts` as well
Platform.registerDefaultsLoader(() => ({
  TimeCoordinator: __internalTimeCoordinator,
  DPoPSigningAuthority: __internalDPoPSigningAuthority
}));
