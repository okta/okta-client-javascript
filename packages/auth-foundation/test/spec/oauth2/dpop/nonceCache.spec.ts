import { DPoPNonceCache } from 'src/oauth2/dpop';

describe('DPoPNonceCache', () => {

  describe('InMemoryCache', () => {
    it('caches dpop nonce values', () => {
      const cache = new DPoPNonceCache.InMemoryCache();

      expect(cache.getNonce('foo')).toBe(undefined);
      cache.cacheNonce('foo', 'bar');
      expect(cache.getNonce('foo')).toBe('bar');
      cache.cacheNonce('foo', 'foo');
      expect(cache.getNonce('foo')).toBe('foo');
      cache.clear();
      expect(cache.getNonce('foo')).toBe(undefined);
    });
  });

  describe('PersistentCache', () => {
    afterEach(() => {
      localStorage.clear();
    });

    it('caches dpop nonce values', () => {
      const cache = new DPoPNonceCache.PersistentCache('storageKey');

      expect(localStorage.getItem('storageKey')).toBe(null);
      expect(cache.getNonce('foo')).toBe(undefined);

      cache.cacheNonce('foo', 'bar');
      expect(localStorage.getItem('storageKey')).toEqual(expect.any(String));
      expect(cache.getNonce('foo')).toBe('bar');

      cache.cacheNonce('foo', 'foo');
      expect(localStorage.getItem('storageKey')).toEqual(expect.any(String));
      expect(cache.getNonce('foo')).toBe('foo');

      cache.clear();
      expect(localStorage.getItem('storageKey')).toBe(null);
      expect(cache.getNonce('foo')).toBe(undefined);
    });

    it('removes entries older than 20 hours', () => {
      const cache = new DPoPNonceCache.PersistentCache('storageKey');
      localStorage.setItem('storageKey', JSON.stringify({
        foo: { nonce: 'nonce_upon_a_time', ts: 100 }
      }));

      expect(cache.getNonce('foo')).toBe(undefined);
    });
  });

});
