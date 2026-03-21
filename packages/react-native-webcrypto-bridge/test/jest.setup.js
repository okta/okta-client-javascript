// Mock the native module for Jest tests
jest.mock('./src/NativeWebCryptoBridge', () => ({
  default: {
    digest: jest.fn(async (algorithm, data) => data),
    generateKey: jest.fn(async () => JSON.stringify({ id: 'test-key-id' })),
    exportKey: jest.fn(async () => JSON.stringify({ kty: 'RSA', n: 'test', e: 'AQAB' })),
    importKey: jest.fn(async () => 'imported-key-id'),
    sign: jest.fn(async () => 'signature'),
    verify: jest.fn(async () => true),
    getRandomValues: jest.fn(async (length) => {
      return Buffer.from(Array(length).fill(0).map(() => Math.floor(Math.random() * 256))).toString('base64url');
    }),
  },
}));

// Polyfill global crypto for tests
global.crypto = {
  getRandomValues: (arr) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  },
};

// Mock React Native modules
jest.mock('react-native', () => ({
  NativeModules: {
    WebCryptoBridge: {},
  },
  Platform: {
    OS: 'ios',
    select: jest.fn((obj) => obj.ios || obj.default),
  },
}));
