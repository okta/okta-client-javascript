import { getSearchParam } from 'src/utils';

describe('getSearchParam', () => {
  it('extracts values by key from URLSearchParams instance', () => {
    const params = new URLSearchParams({ foo: 'bar' });
    expect(getSearchParam(params, 'foo')).toEqual('bar');
    expect(getSearchParam(params, 'bar')).toEqual(undefined);
  });

  it('throws when more than 1 value exists per a given key', () => {
    // https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams/getAll#examples
    const params = new URLSearchParams();
    params.append('foo', 'bar');
    params.append('foo', 'baz');
    expect(() => getSearchParam(params, 'foo')).toThrow();
  });
});