/**
 * @packageDocumentation
 * @internal
 */

import { addEnv } from '@okta/auth-foundation/internal';

// defined in rollup.config.js
declare const __PKG_NAME__: string;
declare const __PKG_VERSION__: string;

addEnv(`${__PKG_NAME__}/${__PKG_VERSION__}`);

import { Platform } from '@okta/auth-foundation/core';
import { DefaultSigningAuthority } from './platform/dpop/authority.ts';
import { TimeCoordinator } from '@okta/auth-foundation/internal';

Platform.registerDefaultsLoader(() => ({
  TimeCoordinator,
  DPoPSigningAuthority: DefaultSigningAuthority
}));

export * from '@okta/auth-foundation/core';

export { Credential } from './Credential/Credential.ts';
export { CredentialCoordinatorImpl } from './Credential/CredentialCoordinator.ts';
export { BrowserTokenStorage } from './Credential/TokenStorage.ts';
export { DefaultCredentialDataSource } from './Credential/CredentialDataSource.ts';

export { FetchClient } from './FetchClient/index.ts';

export * from './orchestrators/index.ts';

export * from './flows/index.ts';

export { DefaultSigningAuthority } from './platform/dpop/authority.ts';
export { clearDPoPKeyPairs } from './platform/index.ts';
export { PersistentCache } from './platform/dpop/nonceCache.ts';
export { OAuth2Client } from './platform/OAuth2Client.ts';

export * from './utils/isModernBrowser.ts';
