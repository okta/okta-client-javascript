/**
 * A real `BroadcastChannel` implementation is needed within this test file
 * Make sure the `global.BroadcastChannel = X` line executes before any additional imports
 */
import { BroadcastChannel as BC } from 'node:worker_threads';
// @ts-expect-error - Seemingly a JSDOM vs Node impl difference, ignore
global.BroadcastChannel = BC;
import { TaskBridge } from 'src/utils/TaskBridge.ts';


type TestRequest = {
  ADD: {
    foo: number;
    bar: number;
  },
  SUB: {
    foo: number;
    bar: number;
  }
};

type TestResponse = {
  ADD: {
    foo: string;
    bar: string;
  },
  SUB: {
    foo: string;
    bar: string;
  }
};

class TestBus extends TaskBridge<any, any> {
  protected createBridgeChannel (): TaskBridge.BridgeChannel<any> {
    return new BroadcastChannel(this.name) as TaskBridge.BridgeChannel<any>;
  }
  
  protected createTaskChannel(name: string): TaskBridge.TaskChannel<any> {
    return new BroadcastChannel(name) as TaskBridge.TaskChannel<any>;
  }
}

const sleep = (ms: number) => new Promise(resolve => {
  setTimeout(resolve, ms);
});

describe('TaskBridge', () => {
  let receiver: TaskBridge<TestRequest, TestResponse>;
  let sender: TaskBridge<TestRequest, TestResponse>;

  beforeEach(() => {
    receiver = new TestBus('test');
    sender = new TestBus('test');
  });

  afterEach(() => {
    expect(receiver.pending).toEqual(0);
    expect(sender.pending).toEqual(0);

    receiver.close();
    sender.close();
    jest.clearAllTimers();
  });

  it('sends and receives messages between separate instances', async () => {
    jest.useFakeTimers();

    const response = { foo: '2', bar: '1' };

    receiver.subscribe(async (message, reply) => {
      reply(response);
    });

    const { result } = sender.send({ foo: 1, bar: 2 });
    await expect(result).resolves.toEqual(response);
    expect(jest.getTimerCount()).toBe(0);

    jest.useRealTimers();
  });

  it('handles multiple tasks simultaneously', async () => {
    jest.useFakeTimers();

    const response = { foo: '2', bar: '1' };

    receiver.subscribe(async (message, reply) => {
      reply(response);
    });

    const promises = Promise.allSettled(Array.from({ length: 3 }, (_, i) => {
      const { result } = sender.send({ foo: 1 + i, bar: 2 + i });
      return result;
    }));

    await expect(promises).resolves.toEqual([
      { status: 'fulfilled', value: { ...response} },
      { status: 'fulfilled', value: { ...response } },
      { status: 'fulfilled', value: { ...response } },
    ]);

    expect(jest.getTimerCount()).toBe(0);

    jest.useRealTimers();
  });

  it('handles a single task throwing gracefully', async () => {
    jest.useFakeTimers();

    const response = { foo: '2', bar: '1' };

    let taskCount = 0;
    receiver.subscribe(async (message, reply) => {
      const isEven = taskCount === 0 || taskCount % 2 === 0;
      taskCount += 1;
      if (isEven) {
        reply(response);
      }
      else {
        throw new Error('test error');
      }
    });

    const promises = Promise.allSettled(Array.from({ length: 3 }, (_, i) => {
      const { result } = sender.send({ foo: 1 + i, bar: 2 + i });
      return result;
    }));

    await expect(promises).resolves.toEqual([
      { status: 'fulfilled', value: { ...response} },
      { status: 'fulfilled', value: { error: 'test error' } },
      { status: 'fulfilled', value: { ...response } },
    ]);

    expect(jest.getTimerCount()).toBe(0);

    jest.useRealTimers();
  });

  it('gracefully handles an error being thrown by the subscribe handler', async () => {
    jest.useFakeTimers();

    const handler = jest.fn().mockImplementation(async () => {
      throw new Error('test');
    });
    receiver.subscribe(handler);

    const { result } = sender.send({ foo: 1, bar: 2 });
    await expect(result).resolves.toEqual({ error: 'test' });
    expect(jest.getTimerCount()).toBe(0);

    jest.useRealTimers();
  });

  it('can handle aborting pending tasks', async () => {
    jest.useFakeTimers();

    const abortListener = jest.fn();
    const handler = jest.fn().mockImplementation( async (message, reply, { signal }) => {
      signal.addEventListener('abort', abortListener, { once: true });

      await sleep(5000);    // sleep to delay responding to the message, so the abort fires first
      reply({ foo: '1', bar: '2' });
    });
    receiver.subscribe(handler);

    const { result, abort } = sender.send({ foo: 1, bar: 2 });
    // bind abort error listener before the error is thrown
    const expectation = expect(result).rejects.toThrow(new DOMException('Aborted'));

    // flush microtasks to ensure subscribe abortHandler is set up
    await jest.advanceTimersByTimeAsync(10);
    // flush microtasks again so messages are sent over the bridge
    await jest.advanceTimersByTimeAsync(10);

    abort();    // trigger abort
    // flush microtask queue again
    await jest.advanceTimersByTimeAsync(10);
    await jest.advanceTimersByTimeAsync(10);

    // await the `expect(DOMException)` from above
    await expectation;
    // flush all timers from queue
    await jest.runAllTimersAsync();

    expect(handler).toHaveBeenCalled();
    expect(abortListener).toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);

    jest.useRealTimers();
  });

  it('will not timeout a pending request when host is available', async () => {
    jest.useFakeTimers();

    const response = { foo: '2', bar: '1' };
    const largeDelay = 10000;

    // clever way of capturing the requestId
    let requestId;
    const bc = new BroadcastChannel('test');
    bc.onmessage = (evt => {
      if (evt.data.requestId) {
        requestId = evt.data.requestId;
      }
    });

    receiver.subscribe(async (message, reply) => {
      await sleep(largeDelay);   // very long delay
      reply(response);
    });

    const { result } = sender.send({ foo: 1, bar: 2 });
    // advance timers to send BroadcastChannel messages
    await jest.advanceTimersByTimeAsync(100);

    // listen on "response channel" and count number of `PENDING` "pings"
    let pendingCount = 0;
    const channel = new BroadcastChannel(requestId);
    channel.onmessage = (evt) => {
      if (evt.data.status === 'PENDING') {
        pendingCount++;
      }
    };

    // advance the timers to the length of the delay, so response is finally returned
    await jest.advanceTimersByTimeAsync(largeDelay);

    await expect(result).resolves.toEqual(response);
    // expect a predictable number of 'PENDING' pings given the large delay 
    expect(pendingCount).toEqual(largeDelay / receiver.heartbeatInterval);
    expect(jest.getTimerCount()).toBe(0);

    // cleanup
    jest.useRealTimers();
    bc.close();
    channel.close();
  });

  it('will timeout when host does not response within default timeout window', async () => {
    expect.assertions(4);     // ensures `result.catch()` is invoked
    jest.useFakeTimers();

    receiver.close();

    const { result } = sender.send({ foo: 1, bar: 2 });

    // use `.catch` to bind listener synchronously 
    const promise = result.catch(err => {
      expect(err).toBeInstanceOf(TaskBridge.TimeoutError);
    });

    await jest.advanceTimersByTimeAsync(10000);
    await promise;

    expect(jest.getTimerCount()).toBe(0);

    jest.useRealTimers();
  });

  it('will timeout when host does not response within user defined timeout window', async () => {
    expect.assertions(4);     // ensures `result.catch()` is invoked
    jest.useFakeTimers();

    const largeTimeout = 10000;

    receiver.close();

    const { result } = sender.send({ foo: 1, bar: 2 }, { timeout: largeTimeout - 100 });

    // use `.catch` to bind listener synchronously 
    const promise = result.catch(err => {
      expect(err).toBeInstanceOf(TaskBridge.TimeoutError);
    });

    await jest.advanceTimersByTimeAsync(10000);
    await promise;

    expect(jest.getTimerCount()).toBe(0);

    jest.useRealTimers();
  });

  it('will timeout when no host is avaiable', async () => {
    expect.assertions(4);     // ensures `result.catch()` is invoked
    jest.useFakeTimers();

    const timeout = 100;

    // NOTE: no `receiver.subscribe` call

    const { result } = sender.send({ foo: 1, bar: 2 }, { timeout });

    // use `.catch` to bind listener synchronously 
    const promise = result.catch(err => {
      expect(err).toBeInstanceOf(TaskBridge.TimeoutError);
    });

    await jest.advanceTimersByTimeAsync(timeout);
    await promise;

    expect(jest.getTimerCount()).toBe(0);

    jest.useRealTimers();
  });

  it('will abort pending tasks when closed', async () => {
    jest.useFakeTimers();

    const abortListener = jest.fn();
    const handler = jest.fn().mockImplementation(async (message, reply, { signal }) => {
      // confirm the `signal` instance fires an `abort` event
      signal.addEventListener('abort', abortListener);

      // returns Promise which rejects when event is fired
      function rejectWhenFired (target: EventTarget, event: string) {
        return new Promise((_, reject) => {
          target.addEventListener(event, reject, { once: true });
        });
      }

      // track the timers set by `sleep()` within this test
      let sleepTimeout;
      function sleep (delay) {
        return new Promise((resolve) => {
          sleepTimeout = setTimeout(resolve, delay);
        });
      }

      // sleep to delay responding to the message, so the abort fires first
      try {
        await Promise.race([
          sleep(sender.heartbeatInterval * 10),
          rejectWhenFired(signal, 'abort'),
        ]);

        reply({ foo: '1', bar: '2' });
      }
      finally {
        // timeouts set via `sleep()` need to be cleared. Test requires no timers remain
        clearTimeout(sleepTimeout);
      }
    });
    receiver.subscribe(handler);

    const promises = Promise.allSettled(Array.from({ length: 3 }, (_, i) => {
      const { result } = sender.send({ foo: 1 + i, bar: 2 + i });
      return result;
    }));

    // flush microtasks to ensure subscribe handler is set up
    await jest.advanceTimersByTimeAsync(10);

    expect(handler).toHaveBeenCalledTimes(3);

    receiver.close();
    const result = await promises;
    await jest.advanceTimersByTimeAsync(10);

    expect(result).toEqual(Array(3).fill({ status: 'rejected', reason: expect.any(DOMException) }));
    expect(abortListener).toHaveBeenCalledTimes(3);
    expect(jest.getTimerCount()).toBe(0);

    jest.useRealTimers();
  });

});
