/**
 * @packageDocumentation
 * @internal
 */

import { type DPoPStorage, DPoPSigningAuthorityImpl, DPoPSigningAuthority } from '@okta/auth-foundation/core';
import { IndexedDBStore } from '../../utils/IndexedDBStore.ts';


export const DefaultSigningAuthority: DPoPSigningAuthority = new DPoPSigningAuthorityImpl(
  (new IndexedDBStore('DPoPKeys') satisfies DPoPStorage)
);
