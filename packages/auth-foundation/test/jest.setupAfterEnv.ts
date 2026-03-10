import { Platform } from 'src/platform/Platform';
// eslint-disable-next-line no-restricted-imports
import { PlatformDefaults } from 'src/platform/defaults';


Platform.registerDefaultsLoader(() => PlatformDefaults);
