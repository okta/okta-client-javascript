import { Platform } from '@okta/auth-foundation/core';
// eslint-disable-next-line no-restricted-imports
import { PlatformDefaults } from 'src/platform/defaults';


// Setups spa-platform Platform Dependencies within the Platform pattern
// since files are loaded individually, rather than from the index.ts entrypoint
Platform.registerDefaultsLoader(() => PlatformDefaults);
