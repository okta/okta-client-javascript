import { TimeCoordinator } from '@okta/auth-foundation/internal';
import { type PlatformDependencies } from '@okta/auth-foundation/core';

import { DefaultSigningAuthority } from './dpop/authority.ts';
import { PersistentCache } from './dpop/nonceCache.ts';


const NonceCache = new PersistentCache('okta-dpop-nonce');

export const PlatformDefaults: PlatformDependencies = {
  TimeCoordinator,
  DPoPSigningAuthority: DefaultSigningAuthority,
  DPoPNonceCache: NonceCache
};
