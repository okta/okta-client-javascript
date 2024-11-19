import * as utils from 'src/Credential/utils';

describe('utils', () => {
  describe('Array utils methods', () => {
    it('hasSameValues', () => {
      const [a1, a2, a3] = [[1,2,3], [1,2,3], [1,2,5]];
      expect(utils.hasSameValues(a1, a1)).toBe(true);
      expect(utils.hasSameValues(a1, a2)).toBe(true);
      expect(utils.hasSameValues(a1, a3)).toBe(false);
      expect(utils.hasSameValues(a1, [1])).toBe(false);
    });
  });
});
