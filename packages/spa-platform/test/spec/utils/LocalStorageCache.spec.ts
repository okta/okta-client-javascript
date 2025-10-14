import { LocalStorageCache } from 'src/utils/LocalStorageCache';

describe('LocalStorageCache', () => {

  afterEach(() => {
    localStorage.clear();
  });

  it('caches dpop nonce values', () => {
    const cache = new LocalStorageCache('storageKey');

    expect(localStorage.getItem('storageKey')).toBe(null);
    expect(cache.get('foo')).toBe(null);

    // adds record
    cache.add('foo', 'bar');
    expect(localStorage.getItem('storageKey')).toEqual(expect.any(String));
    expect(cache.get('foo')).toBe('bar');

    // updates existing record
    cache.add('foo', 'foo');
    expect(localStorage.getItem('storageKey')).toEqual(expect.any(String));
    expect(cache.get('foo')).toBe('foo');

    // removes record
    cache.remove('foo');
    expect(localStorage.getItem('storageKey')).toBe(null);
    expect(cache.get('foo')).toBe(null);

    // clears all records
    cache.add('foo', 'bar');
    cache.add('bar', 'foo');
    expect(localStorage.getItem('storageKey')).toEqual(expect.any(String));
    expect(cache.get('foo')).toBe('bar');
    expect(cache.get('bar')).toBe('foo');
    cache.clear();
    expect(localStorage.getItem('storageKey')).toBe(null);
    expect(cache.get('foo')).toBe(null);
    expect(cache.get('bar')).toBe(null);
  });

  it('removes entries older than 20 hours', () => {
    const cache = new LocalStorageCache('storageKey');
    localStorage.setItem('storageKey', JSON.stringify({
      foo: { nonce: 'nonce_upon_a_time', ts: 100 }
    }));

    expect(cache.get('foo')).toBe(null);
  });

});