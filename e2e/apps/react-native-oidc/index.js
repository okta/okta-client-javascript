import '@expo/metro-runtime';
import 'expo-router/entry';

import '@okta/auth-foundation';
import { Platform } from '@okta/auth-foundation';

// Install WebCrypto polyfill
import { installWebCryptoPolyfill } from '@okta/react-native-webcrypto-bridge';
installWebCryptoPolyfill();

console.log('Plat', Platform, Platform.TimeCoordinator)
console.log("globalThis.crypto", globalThis.crypto);
// global.crypto = global.crypto ?? globalThis.crypto;

