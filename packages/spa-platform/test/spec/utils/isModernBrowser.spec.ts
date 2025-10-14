import { isModernBrowser } from 'src/utils/isModernBrowser';

describe('isModernBrowser', () => {
  beforeEach(() => {
    // navigator.locks is undefined in jest, needs to be mocked
    (navigator as any).locks = jest.fn().mockReturnValue({});
  });

  it('returns true when browser supports all native dependencies', () => {
    expect(isModernBrowser()).toBe(true);
  });

  it('returns false when WebLocks are not available', () => {
    // nav.locks is mocked in `beforeEach`, un-mock for this test
    (navigator as any).locks = undefined;
    expect(isModernBrowser()).toBe(false);
  });

  it('returns false when crypto is not available', () => {
    const subtle = crypto.subtle;
    (crypto as any).subtle = undefined;
    expect(isModernBrowser()).toBe(false);
    (crypto as any).subtle = subtle;
  });

  it('returns false when BroadcastChannel are not available', () => {
    const restore = global.BroadcastChannel;
    (global as any).BroadcastChannel = undefined;
    expect(isModernBrowser()).toBe(false);
    (global as any).BroadcastChannel = restore;
  });

  it('returns false when AbortControll/Signal are not available', () => {
    const controller = global.AbortController;
    (global as any).AbortController = undefined;
    expect(isModernBrowser()).toBe(false);
    (global as any).AbortController = controller;

    const signal = global.AbortSignal;
    (global as any).AbortSignal = undefined;
    expect(isModernBrowser()).toBe(false);
    (global as any).AbortSignal = signal;
  });
});
