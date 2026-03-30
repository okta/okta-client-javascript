import '@expo/metro-runtime';
import 'expo-router/entry';

import { NativeModules } from 'react-native';

console.log('Available NativeModules:', Object.keys(NativeModules));

import { Platform, installWebCryptoPolyfill } from '@okta/react-native-platform';
installWebCryptoPolyfill();

console.log('Plat', Platform, Platform.TimeCoordinator)
console.log("globalThis.crypto", globalThis.crypto);
// global.crypto = global.crypto ?? globalThis.crypto;

