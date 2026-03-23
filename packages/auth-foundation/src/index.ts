/** 
 * @module Core
 */

export * from './core.ts';

import { Platform } from './platform/Platform.ts';
// eslint-disable-next-line no-restricted-imports
import { PlatformDefaults } from './platform/defaults.ts';

console.log('main index imported')

/**
 * @internal
 * Registers all default implementations of Platform dependencies. This will include them all in any
 * output bundle. Use `core.ts` if this is undesirable.
 */
Platform.registerDefaultsLoader(() => PlatformDefaults);

console.log('platform: ', PlatformDefaults, Platform.TimeCoordinator)