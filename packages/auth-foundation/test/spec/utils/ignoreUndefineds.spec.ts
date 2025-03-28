import { ignoreUndefineds } from 'src/utils';

describe('ignoreUndefineds', () => {
  // { foo: 1, bar: undefined } vs { foo: 1 }
  it('returns a new object without explicitly keyed `undefined` values', () => {
    const test = {
      foo: 1,
      bar: undefined,
      baz: 'undefined',      // not removed,
      0: 1
    };

    const result = ignoreUndefineds(test);

    // the resulting object should still the be the "same value". 
    // During comparsion there is no difference between an without
    // ever having defined a property and one that has explicitly
    // defined a property `undefined`
    // tldr; { foo: undefined } equals { }
    expect(test).toEqual(result);
    // ensures the original object is not modified, the property which
    // is explicitly set to `undefined` still "remains"
    expect(Object.keys(test).length).toEqual(4);
    expect(Object.keys(result).length).toEqual(3);
  });
});
