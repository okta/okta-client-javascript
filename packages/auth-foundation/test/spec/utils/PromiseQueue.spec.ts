import { PromiseQueue } from 'src/utils/PromiseQueue';

describe('PromiseQueue', () => {
  it('should queue promise methods and execute them 1 by 1', async () => {
    jest.useFakeTimers();

    const queue = new PromiseQueue();
    const values: string[] = [];

    const delay = (value: string, ms: number) => new Promise<void>(resolve => {
      setTimeout(() => {
        values.push(value);
        resolve();
      }, ms);
    });

    queue.push(() => delay('first', 3000));
    queue.push(() => delay('second', 1000));

    expect(queue.size).toEqual(1);
    expect(values.length).toEqual(0);
    await jest.advanceTimersByTimeAsync(3001);
    expect(queue.size).toEqual(0);
    expect(values.length).toEqual(1);
    expect(values[0]).toEqual('first');
    await jest.advanceTimersByTimeAsync(1001);
    expect(queue.size).toEqual(0);
    expect(values.length).toEqual(2);
    expect(values[1]).toEqual('second');

    jest.useRealTimers();
  });

  it('should gracefully handle queue promises rejecting', async () => {
    const queue = new PromiseQueue();

    const fn1 = jest.fn().mockRejectedValue('REJECTED');
    const fn2 = jest.fn().mockResolvedValue('RESOLVED');

    await expect(queue.push(fn1)).rejects.toEqual('REJECTED');
    await expect(queue.push(fn2)).resolves.toEqual('RESOLVED');
  });
});