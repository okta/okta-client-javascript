/**
 * @packageDocumentation
 * @internal
 * 
 * NOTE: DO NOT INCLUDE ANY FILES WHICH DEPEND ON `@okta/oauth2-flows`
 */

import { addEnv } from '@okta/auth-foundation/internal';

// defined in rollup.config.js
declare const __PKG_NAME__: string;
declare const __PKG_VERSION__: string;

addEnv(`${__PKG_NAME__}/${__PKG_VERSION__}`);

export * from '@okta/auth-foundation/core';

// eslint-disable-next-line no-restricted-imports
export * from './platform/defaults.ts';

export { ReactNativeTokenStorage } from './Credential/TokenStorage.ts';
export { openAuthSession } from './BrowserSession/index.ts';
export type { BrowserSessionResult, BrowserSessionErrorCode } from './BrowserSession/types.ts';
