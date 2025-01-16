import { addEnv } from '@okta/auth-foundation/internal';

// defined in rollup.config.js
declare const __PKG_NAME__: string;
declare const __PKG_VERSION__: string;

// adds package info to OKTA UA string
addEnv(`${__PKG_NAME__}/${__PKG_VERSION__}`);

export * from './types';
export * from './OAuth2Flow';
export * from './AuthorizationCodeFlow';
export * from './SessionLogoutFlow';
