import type { PlatformDependencies } from './Platform.ts';
import { DefaultTimeCoordinator } from '../utils/TimeCoordinator.ts';
import {
  DPoPNonceCache,
  DPoPStorage,
  DPoPSigningAuthorityImpl
} from '../oauth2/dpop/index.ts';


const TimeCoordinator = new DefaultTimeCoordinator();
export { TimeCoordinator };     // exporting directly because it's likely other platforms will leverage this impl

const DPoPSigningAuthority = new DPoPSigningAuthorityImpl(
  new DPoPStorage.MemoryStore()
);

const DefaultDPoPNonceCache = new DPoPNonceCache.InMemoryCache();


/**
 * @internal
 * *DO NOT IMPORT THIS FILE* in any location other than `src/index.ts` to avoid including default
 * platform implementations in bundle output
 */
export const PlatformDefaults: PlatformDependencies = {
  TimeCoordinator,
  DPoPSigningAuthority,
  DPoPNonceCache: DefaultDPoPNonceCache
};
