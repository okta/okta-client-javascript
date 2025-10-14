import { PersistentCache } from 'src/platform/dpop/nonceCache';

describe('DPoPNonceCache', () => {

  describe('PersistentCache', () => {
    afterEach(() => {
      localStorage.clear();
    });

    it('caches dpop nonce values', async () => {
      const cache = new PersistentCache('storageKey');

      expect(localStorage.getItem('storageKey')).toBe(null);
      expect(await cache.getNonce('foo')).toBe(undefined);

      await cache.cacheNonce('foo', 'bar');
      expect(localStorage.getItem('storageKey')).toEqual(expect.any(String));
      expect(await cache.getNonce('foo')).toBe('bar');

      await cache.cacheNonce('foo', 'foo');
      expect(localStorage.getItem('storageKey')).toEqual(expect.any(String));
      expect(await cache.getNonce('foo')).toBe('foo');

      await cache.clear();
      expect(localStorage.getItem('storageKey')).toBe(null);
      expect(await cache.getNonce('foo')).toBe(undefined);
    });

    it('removes entries older than 20 hours', async () => {
      const cache = new PersistentCache('storageKey');
      localStorage.setItem('storageKey', JSON.stringify({
        foo: { nonce: 'nonce_upon_a_time', ts: 100 }
      }));

      expect(await cache.getNonce('foo')).toBe(undefined);
    });
  });

});