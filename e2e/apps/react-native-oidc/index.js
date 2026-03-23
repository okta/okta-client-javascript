import '@expo/metro-runtime';
import 'expo-router/entry';

// Import auth-foundation which auto-registers platform defaults
console.log('[index.js] Loading...');
// import * as AuthFoundation from '@okta/auth-foundation';
import '@okta/auth-foundation';
console.log('[index.js] auth-foundation loaded');
import { Platform } from '@okta/auth-foundation';

console.log("Platform loaded:", Platform);
console.log("TimeCoordinator:", Platform.TimeCoordinator);
console.log("TimeCoordinator type:", typeof Platform.TimeCoordinator);
console.log("TimeCoordinator keys:", Object.keys(Platform.TimeCoordinator));
console.log("TimeCoordinator.now type:", typeof Platform.TimeCoordinator?.now);

// Try to call now() and log the error
try {
  const now = Platform.TimeCoordinator.now();
  console.log("now() result:", now);
} catch (e) {
  console.error("Error calling now():", e);
  console.error("TimeCoordinator full:", JSON.stringify(Platform.TimeCoordinator, null, 2));
}

console.log('Plat', Platform, Platform.TimeCoordinator)

// Install WebCrypto polyfill
import { installWebCryptoPolyfill } from '@okta/react-native-webcrypto-bridge';
installWebCryptoPolyfill();


console.log('Plat', Platform, Platform.TimeCoordinator)

console.log("globalThis.crypto", globalThis.crypto);
// global.crypto = global.crypto ?? globalThis.crypto;

