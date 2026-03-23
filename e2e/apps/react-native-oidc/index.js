import '@okta/auth-foundation';
import { Platform } from '@okta/auth-foundation/core';
import { PlatformDefaults } from '@okta/auth-foundation/internal';

// Platform.registerDefaultsLoader(() => PlatformDefaults);

import { installWebCryptoPolyfill } from '@okta/react-native-webcrypto-bridge';
console.log("TESTSSSSSS");

installWebCryptoPolyfill();

console.log("globalThis.crypto", globalThis.crypto);
console.log('Plat', Platform, Platform.TimeCoordinator)
// global.crypto = global.crypto ?? globalThis.crypto;

import '@expo/metro-runtime';
import 'expo-router/entry';

