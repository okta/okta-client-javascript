import { addEnv } from '@okta/auth-foundation';

// TODO: rename from package.json or use build?
const packageName = '@okta/spa-platform';
const version = '0.0.0';
addEnv(`${packageName}/${version}`);

export * from './Credential';
export * from './CredentialOrchestrator';
export * from './FetchClient';
