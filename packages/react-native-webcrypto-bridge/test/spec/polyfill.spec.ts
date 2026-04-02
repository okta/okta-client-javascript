import { installWebCryptoPolyfill } from '../../src/index';

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

  it('should have randomUUID', () => {
    expect(typeof global.crypto.randomUUID).toBe('function');
    const uuid = global.crypto.randomUUID();
    expect(uuid).toBeDefined();
    expect(typeof uuid).toBe('string');
  });
});

