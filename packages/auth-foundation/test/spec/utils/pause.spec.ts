import { pause } from 'src/utils/pause';


describe('pause', () => {
  it('returns a promise which resolves after a delay', async () => {
    jest.useFakeTimers();

    let fulfilled = false;

    const promise = pause(10000).then(() => {
      fulfilled = true;
    });

    await jest.advanceTimersByTimeAsync(2000);
    expect(fulfilled).toBe(false);
    await jest.advanceTimersByTimeAsync(2000);
    expect(fulfilled).toBe(false);
    await jest.advanceTimersByTimeAsync(10000);
    expect(fulfilled).toBe(true);

    await promise;

    jest.useRealTimers();
  });
});
