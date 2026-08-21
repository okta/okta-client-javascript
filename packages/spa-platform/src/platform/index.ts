/**
 * > [!Tip]
 * > See {@link AuthFoundation!Platform | Platform} explanation first.
 * 
 * Provides browser-specific default implementations of
 * {@link AuthFoundation!PlatformDependencies | PlatformDependencies}
 * @module Platform
 * @see [SPA Platform: Platform](/api/spa-platform/#platform)
 */

export * from './OAuth2Client.ts';
import { DefaultSigningAuthority } from './dpop/authority.ts';

/**
 * Clears all DPoP public / private key pairs from storage
 * 
 * @remarks
 * Recommended to be called when performing sign out
 * 
 */
export function clearDPoPKeyPairs (): Promise<void> {
  return DefaultSigningAuthority.clearDPoPKeyPairs();
}
