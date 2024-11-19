import { addEnv } from '@okta/auth-foundation';

// TODO: rename from package.json or use build?
const packageName = '@okta/oauth-flows';
const version = '0.0.0';
addEnv(`${packageName}/${version}`);

export * from './types';
export * from './AuthorizationCodeFlow';
export * from './SessionLogoutFlow';
