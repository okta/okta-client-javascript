/** 
 * @module Core
 */

export * from './core.ts';

import { Platform } from './platform/Platform.ts';
import timeCoordinator from './utils/TimeCoordinator.ts';
import { DefaultDPoPSigningAuthority } from './oauth2/dpop/index.ts';

Platform.registerDefaultsLoader(() => ({
  TimeCoordinator: timeCoordinator,
  DPoPSigningAuthority: DefaultDPoPSigningAuthority
}));
