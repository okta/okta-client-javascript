import { installWebCryptoPolyfill } from 'src/WebCryptoPolyfill';

describe('@okta/react-native-webcrypto-bridge', () => {
  beforeAll(() => {
    installWebCryptoPolyfill();
  });

  it('should install crypto global', () => {
    expect(global.crypto).toBeDefined();
    expect(global.crypto.subtle).toBeDefined();
    expect(global.crypto.getRandomValues).toBeDefined();
  });

  it('should have SubtleCrypto methods', () => {
    expect(typeof global.crypto.subtle.digest).toBe('function');
    expect(typeof global.crypto.subtle.generateKey).toBe('function');
    expect(typeof global.crypto.subtle.exportKey).toBe('function');
    expect(typeof global.crypto.subtle.importKey).toBe('function');
    expect(typeof global.crypto.subtle.sign).toBe('function');
    expect(typeof global.crypto.subtle.verify).toBe('function');
  });

  it('should generate random values', () => {
    const array = new Uint8Array(32);
    const result = global.crypto.getRandomValues(array);
    
    expect(result).toBe(array);
    expect(result.length).toBe(32);
    
    // Check that values are not all zeros
    const hasNonZero = Array.from(result).some(v => v !== 0);
    expect(hasNonZero).toBe(true);
  });
});
