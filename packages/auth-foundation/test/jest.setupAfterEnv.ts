import { Platform } from 'src/platform/Platform';
import TimeCoordinator from 'src/utils/TimeCoordinator';
import { DefaultDPoPSigningAuthority } from 'src/oauth2/dpop';

Platform.registerDefaultsLoader(() => ({
  TimeCoordinator, 
  DPoPSigningAuthority: DefaultDPoPSigningAuthority
}));
