/**
 * @packageDocumentation
 * @internal
 */

import { addEnv } from '@okta/auth-foundation/internal';

// defined in rollup.config.js
declare const __PKG_NAME__: string;
declare const __PKG_VERSION__: string;

addEnv(`${__PKG_NAME__}/${__PKG_VERSION__}`);

// Install the React Native WebCrypto Bridge Polyfill
import { installWebCryptoPolyfill } from '@okta/react-native-webcrypto-bridge';
export { installWebCryptoPolyfill };
installWebCryptoPolyfill();

// Include all core exports
export * from './core.ts';

import { Platform, Credential } from '@okta/auth-foundation/core';
import { PlatformDefaults, ReactNativeTokenStorage } from './core.ts';

// Register the React Native Platform default singleton dependencies
Platform.registerDefaultsLoader(() => PlatformDefaults);

// Override TokenStorage to use React Native Storage Bridge
Credential.coordinator.tokenStorage = new ReactNativeTokenStorage();
