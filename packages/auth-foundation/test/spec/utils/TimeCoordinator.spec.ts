import { Timestamp } from 'src/utils/TimeCoordinator';

describe('Timestamp', () => {
  let ctx: any = {};
  beforeEach(() => {
    ctx = {};
  });

  it('constructs', () => {
    const ts = new Timestamp(Date.now() / 1000);
    expect(ts).toBeInstanceOf(Timestamp);
  });

  it('static .from', () => {
    const ts = new Timestamp(Date.now() / 1000);
    expect(ts).toBeInstanceOf(Timestamp);

    expect(Timestamp.from(ts)).toBeInstanceOf(Timestamp);
    expect(Timestamp.from(Date.now() / 1000)).toBeInstanceOf(Timestamp);
    expect(Timestamp.from(new Date())).toBeInstanceOf(Timestamp);
  });

  it('.value', () => {
    const now = Date.now() / 1000;
    const ts = new Timestamp(now);
    expect(ts.value).toEqual(now);
  });

  it('.asDate', () => {
    const now = Date.now() / 1000;
    const ts = new Timestamp(now);
    expect(ts.value).toEqual(now);
    expect(ts.asDate).toBeInstanceOf(Date);
    expect(ts.asDate.valueOf()).toEqual(now * 1000);
  });

  describe('comparisons', () => {
    beforeEach(() => {
      const now = Math.floor(Date.now() / 1000);
      const ts = new Timestamp(now);
      ctx = { now, ts };
    });

    test('isBefore', () => {
      const { now, ts } = ctx;
      // Compared to EpochTime (aka number)
      expect(ts.isBefore(now)).toBe(false);
      expect(ts.isBefore(now - 1)).toBe(false);
      expect(ts.isBefore(now + 1)).toBe(true);
      // Compared to Date
      expect(ts.isBefore(new Date(now * 1000))).toBe(false);
      expect(ts.isBefore(new Date(now * 1000 - 1))).toBe(false);
      expect(ts.isBefore(new Date(now * 1000 + 1))).toBe(true);
      // Compared to Timestamp
      expect(ts.isBefore(new Timestamp(now))).toBe(false);
      expect(ts.isBefore(new Timestamp(now - 1))).toBe(false);
      expect(ts.isBefore(new Timestamp(now + 1))).toBe(true);
    });

    test('isAfter', () => {
      const { now, ts } = ctx;
      // Compared to EpochTime (aka number)
      expect(ts.isAfter(now)).toBe(false);
      expect(ts.isAfter(now - 1)).toBe(true);
      expect(ts.isAfter(now + 1)).toBe(false);
      // Compared to Date
      expect(ts.isAfter(new Date(now * 1000))).toBe(false);
      expect(ts.isAfter(new Date(now * 1000 - 1))).toBe(true);
      expect(ts.isAfter(new Date(now * 1000 + 1))).toBe(false);
      // Compared to Timestamp
      expect(ts.isAfter(new Timestamp(now))).toBe(false);
      expect(ts.isAfter(new Timestamp(now - 1))).toBe(true);
      expect(ts.isAfter(new Timestamp(now + 1))).toBe(false);
    });
  });
});
