/**
 * @module
 * @mergeModuleWith Platform
 */

import { Token as TokenBase, DPoPSigningAuthority } from '@okta/auth-foundation';
import { DefaultSigningAuthority } from './dpop/authority.ts';


/**
 * Browser-specific implementation of {@link AuthFoundation!Token | Token}
 * 
 * @group Token
 * @noInheritDoc
 */
export class Token extends TokenBase {
  public readonly dpopSigningAuthority: DPoPSigningAuthority = DefaultSigningAuthority;
}

/**
 * @group Token
 */
export namespace Token {
  /**
   * Re-exports `@okta/auth-foundation` `Token.Metadata`
   */
  export type Metadata = TokenBase.Metadata;
  /**
   * Re-exports `@okta/auth-foundation` `Token.Context`
   */
  export type Context = TokenBase.Context;
}
