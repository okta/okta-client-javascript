import * as utils from 'src/utils/equality';

describe('Equality Utils', () => {
  it('hasSameValues', () => {
    const [a1, a2, a3] = [[1,2,3], [1,2,3], [1,2,5]];
    expect(utils.hasSameValues(a1, a1)).toBe(true);
    expect(utils.hasSameValues(a1, a2)).toBe(true);
    expect(utils.hasSameValues(a1, a3)).toBe(false);
    expect(utils.hasSameValues(a1, [1])).toBe(false);
  });

  it('doesPartialMatch', () => {
    const target = { foo: 1, bar: 2 };
    expect(utils.doesPartialMatch(target, { foo: 1 })).toBe(true);
    expect(utils.doesPartialMatch(target, { foo: 1, bar: 2 })).toBe(true);
    expect(utils.doesPartialMatch(target, { baz: 1 })).toBe(false);
    expect(utils.doesPartialMatch(target, { foo: 2 })).toBe(false);
  });
});

