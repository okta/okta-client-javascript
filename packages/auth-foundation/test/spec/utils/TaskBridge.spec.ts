import { BroadcastChannelLike, JsonRecord } from 'src/types';
import { TaskBridge } from 'src/utils/TaskBridge.ts';
import { eventAsPromise } from 'src/utils/asPromise.ts';

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

class TestChannel<M extends JsonRecord> implements BroadcastChannelLike<M> {
  channel: BroadcastChannel;
  #handler: BroadcastChannelLike<M>['onmessage'] = null;

  constructor (public name: string) {
    this.channel = new BroadcastChannel(name);
  }

  get onmessage () {
    return this.#handler;
  }

  set onmessage (handler) {
    if (handler === null) {
      this.channel.onmessage = null;
      this.#handler = null;
    }

    console.log('handler set', handler);

    this.#handler = async (event) => {
      console.log('got message', event.data);
      // const reply = (response) => this.channel.postMessage(response);
      // @ts-ignore
      await handler(event.data);
    };

    this.channel.onmessage = this.#handler;
  }

  postMessage(message: M): void {
    console.log('postMessage called', message)
    this.channel.postMessage(message);
  }

  close () {
    this.channel.close();
  }
}

class TestBus extends TaskBridge<any, any> {

  // protected createBridgeChannel (): TaskBridge.BridgeChannel<TestRequest[keyof TestRequest]> {
  //   return new TestChannel(this.name);
  // }

  // protected createTaskChannel<K extends keyof TestRequest & keyof TestResponse>(name: string): TaskBridge.TaskChannel<TestResponse[K]> {
  //   return new TestChannel(name);
  // }

  protected createBridgeChannel (): TaskBridge.BridgeChannel<any> {
    return new BroadcastChannel(this.name) as TaskBridge.BridgeChannel<any>;
  }
  
  protected createTaskChannel(name: string): TaskBridge.TaskChannel<any> {
    return new BroadcastChannel(name) as TaskBridge.TaskChannel<any>;
  }
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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

  describe('test', () => {
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

    it('can handle aborting pending tasks', async () => {
      jest.useFakeTimers();

      const abortListener = jest.fn();
      const handler = jest.fn().mockImplementation( async (message, reply, { signal }) => {
        signal.addEventListener('abort', abortListener, { once: true });

        await sleep(50);    // sleep to delay responding to the message, so the abort fires first
        reply({ foo: '1', bar: '2' });
      });
      receiver.subscribe(handler);

      const { result, abort } = sender.send({ foo: 1, bar: 2 });

      // flush microtasks to ensure subscribe abortHandler is set up
      // await sleep(10);
      await jest.advanceTimersByTimeAsync(10);

      abort();

      await expect(result).rejects.toThrow(DOMException);
      await expect(result).rejects.toThrow('Aborted');

      // wait a bit more to ensure abort listener is called
      // await sleep(100);
      await jest.advanceTimersByTimeAsync(100);

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
        console.log('[bc]', evt.data);
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

    fit('will abort pending tasks when closed', async () => {
      jest.useFakeTimers();

      const abortListener = jest.fn();
      const handler = jest.fn().mockImplementation(async (message, reply, { signal }) => {
        signal.addEventListener('abort', abortListener);

        // sleep to delay responding to the message, so the abort fires first
        // await sleep(sender.heartbeatInterval * 10);

        await Promise.race([
          sleep(sender.heartbeatInterval * 10),
          eventAsPromise(signal, 'abort', true),
        ]);
        
        reply({ foo: '1', bar: '2' });
      });
      receiver.subscribe(handler);

      const promises = Promise.allSettled(Array.from({ length: 3 }, (_, i) => {
        const { result } = sender.send({ foo: 1 + i, bar: 2 + i }, { timeout: null });
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
    }, 10000);
  });

  // xdescribe('', async () => {

  // });

  // xdescribe('', async () => {

  // });
});
