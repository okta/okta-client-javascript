import { mergeHeaders, mergeURLSearchParameters } from 'src/utils';

describe('merge utils', () => {

  describe('mergeHeaders', () => {
    it('merges key/value pairs', () => {
      const h1 = new Headers({ foo: '1' });
      const h2 = new Headers({ bar: '2' });
      const h3 = { baz: '3' };
      const result = mergeHeaders(h1, h2, h3);
      expect(result).toEqual(h1);
      expect(result).toBe(h1);
      expect(result).not.toBe(h2);
      expect(result).not.toBe(h3);
      expect(result.get('foo')).toEqual('1');
      expect(result.get('bar')).toEqual('2');
      expect(result.get('baz')).toEqual('3');
    });
  
    it('removes keys when value is `undefined`' , () => {
      const h1 = new Headers({ foo: '1', bar: '2' });
      const result = mergeHeaders(h1, { bar: undefined });
      expect(result.get('foo')).toEqual('1');
      expect(result.get('bar')).toBeNull();
    });
  
    it('throws on key collision', () => {
      const h1 = new Headers({ foo: '1' });
      const h2 = new Headers({ foo: '2' });
      expect(() => mergeHeaders(h1, h2)).toThrow();
    });
  });
  
  describe('mergeURLSearchParameters', () => {
    it('merges key/value pairs', () => {
      const h1 = new URLSearchParams({ foo: '1' });
      const h2 = new URLSearchParams({ bar: '2' });
      const h3 = { baz: '3' };
      const result = mergeURLSearchParameters(h1, h2, h3);
      expect(result).toEqual(h1);
      expect(result).toBe(h1);
      expect(result).not.toBe(h2);
      expect(result).not.toBe(h3);
      expect(result.get('foo')).toEqual('1');
      expect(result.get('bar')).toEqual('2');
      expect(result.get('baz')).toEqual('3');
    });
  
    it('removes keys when value is `undefined`' , () => {
      const h1 = new URLSearchParams({ foo: '1', bar: '2' });
      const result = mergeURLSearchParameters(h1, { bar: undefined });
      expect(result.get('foo')).toEqual('1');
      expect(result.get('bar')).toBeNull();
    });
  
    it('throws on key collision', () => {
      const h1 = new URLSearchParams({ foo: '1' });
      const h2 = new URLSearchParams({ foo: '2' });
      expect(() => mergeURLSearchParameters(h1, h2)).toThrow();
    });
  });
});
