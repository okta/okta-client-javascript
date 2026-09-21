import { installWebCryptoPolyfill } from '../../src/index';
import NativeWebCryptoBridge from '../../src/NativeWebCryptoBridge';

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

  it('should throw OperationError if native bridge returns wrong length', () => {
    expect.assertions(1);

    // Spy on the actual imported NativeWebCryptoBridge
    const mockFn = jest.fn(() => btoa('x')); // 1 byte when we ask for 32
    const originalFn = NativeWebCryptoBridge.getRandomValues;
    NativeWebCryptoBridge.getRandomValues = mockFn;

    const array = new Uint8Array(32);
    try {
      global.crypto.getRandomValues(array);
    } catch (error) {
      if (error instanceof DOMException) {
        expect(error.name).toBe('OperationError');
      } else {
        throw error;
      }
    } finally {
      // Restore
      NativeWebCryptoBridge.getRandomValues = originalFn;
    }
  });
});
