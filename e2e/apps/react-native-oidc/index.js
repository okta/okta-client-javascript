import '@expo/metro-runtime';
import 'expo-router/entry';

import { Platform, installWebCryptoPolyfill } from '@okta/react-native-platform';
import { Linking } from 'react-native';
installWebCryptoPolyfill();

// Global deeplink debugging - log ALL deeplinks received
Linking.addEventListener('url', ({ url }) => {
  console.log('[GLOBAL DEEPLINK RECEIVED]', url);
});

console.log('Plat', Platform, Platform.TimeCoordinator)
console.log("globalThis.crypto", globalThis.crypto);
// global.crypto = global.crypto ?? globalThis.crypto;

import { Credential } from '@okta/react-native-platform';
Credential.coordinator.tokenStorage.emitter.on('token_added', (...args) => console.log(args))
