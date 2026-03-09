import { Platform } from 'src/platform/Platform';
// eslint-disable-next-line no-restricted-syntax
import { __internalTimeCoordinator } from 'src/utils/TimeCoordinator';
// eslint-disable-next-line no-restricted-syntax
import { __internalDPoPSigningAuthority } from 'src/oauth2/dpop';

Platform.registerDefaultsLoader(() => ({
  TimeCoordinator: __internalTimeCoordinator, 
  DPoPSigningAuthority: __internalDPoPSigningAuthority
}));
