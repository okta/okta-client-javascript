import { addEnv } from '@okta/auth-foundation/internal';

// defined in rollup.config.js
declare const __PKG_NAME__: string;
declare const __PKG_VERSION__: string;


addEnv(`${__PKG_NAME__}/${__PKG_VERSION__}`);

export * from './Credential';
export * from './TokenOrchestrator';
export * from './FetchClient';

export * from './utils/isModernBrowser';
