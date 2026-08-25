/**
 * Includes extensions of OAuth2 flows designed for a browser environment. Performing oauth2 flows sometimes referred 
 * to as "front-channel"; The web application itself is requesting tokens from the authorization server.
 * 
 * > [!IMPORTANT]
 * > These exports are **NOT** available from the default export.
 * >
 * > Use `import from '@okta/spa-platform/flows'`.
 * 
 * @remarks
 * Theses exports depend on `@okta/oauth2-flows`. In order to mark `@okta/oauth2-flows` as an optional dependency,
 * these exports are kept separate from the default export.
 * 
 * @see [SPA Platform: Entry Points](/api/spa-platform/#entry-points)
 * 
 * @module Flows
 */


export * from './AuthorizationCodeFlow.ts';
export * from './SessionLogoutFlow.ts';
export * from './InterclientAccessFlow.ts';
