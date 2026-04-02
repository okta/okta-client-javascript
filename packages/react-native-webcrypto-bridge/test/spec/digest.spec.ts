import { installWebCryptoPolyfill } from '../../src/index';

describe('subtle.digest', () => {
  beforeAll(() => {
    installWebCryptoPolyfill();
  });

  it('should call native digest with SHA-256 and return an ArrayBuffer', async () => {
    const data = new TextEncoder().encode('hello world');
    const result = await global.crypto.subtle.digest('SHA-256', data);

    expect(result).toBeInstanceOf(ArrayBuffer);
    // The mock echoes data back, so the result should have content
    expect(result.byteLength).toBeGreaterThan(0);
  });

  it('should accept an ArrayBuffer directly', async () => {
    const data = new Uint8Array([1, 2, 3, 4]).buffer;
    const result = await global.crypto.subtle.digest('SHA-256', data);

    expect(result).toBeInstanceOf(ArrayBuffer);
  });

  it('should reject unsupported algorithms', async () => {
    const data = new Uint8Array([1, 2, 3]);
    await expect(
      global.crypto.subtle.digest('SHA-512', data)
    ).rejects.toThrow(/Unsupported algorithm/);
  });

  it('should reject SHA-1', async () => {
    const data = new Uint8Array([1, 2, 3]);
    await expect(
      global.crypto.subtle.digest('SHA-1', data)
    ).rejects.toThrow(/Unsupported algorithm/);
  });
});
