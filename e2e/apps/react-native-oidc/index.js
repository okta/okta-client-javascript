import '@expo/metro-runtime';
import 'expo-router/entry';

import { Platform, installWebCryptoPolyfill } from '@okta/react-native-platform';
installWebCryptoPolyfill();

console.log('Plat', Platform, Platform.TimeCoordinator)
console.log("globalThis.crypto", globalThis.crypto);
// global.crypto = global.crypto ?? globalThis.crypto;

