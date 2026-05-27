/**
 * @packageDocumentation
 * @internal
 */

import { addEnv } from '@okta/auth-foundation/internal';

// defined in rollup.config.js
declare const __PKG_NAME__: string;
declare const __PKG_VERSION__: string;

addEnv(`${__PKG_NAME__}/${__PKG_VERSION__}`);

// eslint-disable-next-line no-restricted-imports
export * from './platform/defaults.ts';

export * from '@okta/auth-foundation/core';

export * from '@okta/oauth2-flows';

import { Platform } from '@okta/auth-foundation/core';
// eslint-disable-next-line no-restricted-imports
import { PlatformDefaults } from './platform/defaults.ts';

// Register the React Native Platform default singleton dependencies
Platform.registerDefaultsLoader(() => PlatformDefaults);

// Install the React Native WebCrypto Bridge Polyfill
import { installWebCryptoPolyfill } from '@okta/react-native-webcrypto-bridge';
export { installWebCryptoPolyfill };
installWebCryptoPolyfill();

// Override TokenStorage to use React Native Storage Bridge
import { ReactNativeTokenStorage } from './Credential/TokenStorage.ts';
import { Credential } from '@okta/auth-foundation/core';
Credential.coordinator.tokenStorage = new ReactNativeTokenStorage();
