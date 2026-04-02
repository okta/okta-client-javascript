import { installWebCryptoPolyfill } from '../../src/index';

describe('getRandomValues', () => {
  beforeAll(() => {
    installWebCryptoPolyfill();
  });

  it('should fill a Uint8Array with random bytes', () => {
    const array = new Uint8Array(32);
    const result = global.crypto.getRandomValues(array);

    expect(result).toBe(array);
    expect(result.length).toBe(32);

    // Check that values are not all zeros (statistically near-impossible with real randomness)
    const hasNonZero = Array.from(result).some(v => v !== 0);
    expect(hasNonZero).toBe(true);
  });

  it('should fill a Uint8Array of length 1', () => {
    const array = new Uint8Array(1);
    const result = global.crypto.getRandomValues(array);
    expect(result).toBe(array);
    expect(result.length).toBe(1);
  });

  it('should throw if native bridge returns wrong length', () => {
    // Access the mock directly to override it for this test
    const { TurboModuleRegistry } = require('react-native');
    const nativeMock = TurboModuleRegistry.getEnforcing('WebCryptoBridge');
    const originalFn = nativeMock.getRandomValues;

    // Mock returns Base64 for 1 byte when we request more
    nativeMock.getRandomValues = jest.fn(() => btoa('x')); // 1 byte

    const array = new Uint8Array(32);
    expect(() => global.crypto.getRandomValues(array)).toThrow(/expected 32 bytes/);

    // Restore
    nativeMock.getRandomValues = originalFn;
  });
});
