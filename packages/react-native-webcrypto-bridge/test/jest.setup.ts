/* global btoa */

// Mock the native module for Jest tests.
// All binary data is transported as standard Base64 strings, matching
// the NativeWebCryptoBridge.Spec interface.
jest.mock('react-native', () => ({
  TurboModuleRegistry: {
    getEnforcing: jest.fn(() => ({
      digest: jest.fn(async (algorithm, base64Data) => {
        // Echo back base64 data as-is (mock doesn't compute real digest)
        return base64Data;
      }),
      generateKey: jest.fn(async () => JSON.stringify({ id: 'test-key-id' })),
      exportKey: jest.fn(async () => JSON.stringify({ kty: 'RSA', n: 'test', e: 'AQAB' })),
      importKey: jest.fn(async () => 'imported-key-id'),
      sign: jest.fn(async () => {
        // Return Base64-encoded mock signature bytes
        return btoa(String.fromCharCode(...Array(32).fill(0).map(() => Math.floor(Math.random() * 256))));
      }),
      verify: jest.fn(async () => true),
      getRandomValues: jest.fn((length) => {
        // Return Base64-encoded random bytes (synchronous)
        const bytes = Array(length).fill(0).map(() => Math.floor(Math.random() * 256));
        return btoa(String.fromCharCode(...bytes));
      }),
      randomUUID: jest.fn(() => '550e8400-e29b-41d4-a716-446655440000'),
    })),
  },
  NativeModules: {
    WebCryptoBridge: {},
  },
  Platform: {
    OS: 'ios',
    select: jest.fn((obj) => obj.ios || obj.default),
  },
}));
