/**
 * @module Platform
 */

export * from './Token.ts';
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
