/**
 * @packageDocumentation
 * @internal
 *
 * No native browser session is needed for this grant type (no redirect, no PKCE), so it's
 * re-exported as-is from `@okta/oauth2-flows`.
 */

export { ResourceOwnerFlow } from '@okta/oauth2-flows';
