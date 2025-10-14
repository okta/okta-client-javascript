import { DPoPNonceCache } from 'src/oauth2/dpop';

describe('DPoPNonceCache', () => {

  describe('InMemoryCache', () => {
    it('caches dpop nonce values', async () => {
      const cache = new DPoPNonceCache.InMemoryCache();

      expect(await cache.getNonce('foo')).toBe(undefined);
      await cache.cacheNonce('foo', 'bar');
      expect(await cache.getNonce('foo')).toBe('bar');
      await cache.cacheNonce('foo', 'foo');
      expect(await cache.getNonce('foo')).toBe('foo');
      await cache.clear();
      expect(await cache.getNonce('foo')).toBe(undefined);
    });
  });

});
