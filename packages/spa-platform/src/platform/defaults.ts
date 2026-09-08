/**
 * @module
 * @mergeModuleWith Platform
 */


import { TimeCoordinator } from '@okta/auth-foundation/internal';
import { type PlatformDependencies } from '@okta/auth-foundation/core';

import { DefaultSigningAuthority } from './dpop/authority.ts';
import { PersistentCache } from './dpop/nonceCache.ts';


const NonceCache = new PersistentCache('okta-dpop-nonce');

/**
 * {@link AuthFoundation!PlatformDependencies | PlatformDependencies} implementations designed for browsers
 * 
 */
export const PlatformDefaults: PlatformDependencies = {
  /**
   * Same as {@link AuthFoundation!TimeCoordinator | TimeCoordinator}
   */
  TimeCoordinator,
  /**
   * A {@link AuthFoundation!DPoPSigningAuthority | DPoPSigningAuthority} backed by {@link !IndexedDB}.
   */
  DPoPSigningAuthority: DefaultSigningAuthority,
  /**
   * A {@link AuthFoundation!DPoPNonceCache | DPoPNonceCache} backed by {@link !localStorage}.
   */
  DPoPNonceCache: NonceCache
};
