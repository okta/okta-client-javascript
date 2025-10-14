/**
 * @packageDocumentation
 * @internal
 */

import { addEnv } from '@okta/auth-foundation/internal';

// defined in rollup.config.js
declare const __PKG_NAME__: string;
declare const __PKG_VERSION__: string;


addEnv(`${__PKG_NAME__}/${__PKG_VERSION__}`);

export * from './platform/index.ts';
export * from './Credential/index.ts';
export * from './orchestrators/index.ts';
export * from './FetchClient/index.ts';

export * from './utils/isModernBrowser.ts';
