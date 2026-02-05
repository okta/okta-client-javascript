import { BroadcastChannelLike, JsonRecord } from 'src/types';
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
    receiver.close();
    sender.close();
    jest.clearAllTimers();
  });

  describe('test', () => {
    it('sends and receives messages between separate instances', async () => {
      const response = { foo: '2', bar: '1' };

      receiver.subscribe(async (message, reply) => {
        reply(response);
      });
  
      const result = await sender.send({ foo: 1, bar: 2 }).result;
      expect(result).toEqual(response);
    });

    fit('can handle aborting pending tasks', async () => {
      jest.useFakeTimers();
      expect.assertions(4);     // ensures `catch` block is reached

      const abortListener = jest.fn();
      const handler = jest.fn().mockImplementation( async (message, reply, { signal }) => {
        // TODO: why isn't this being called?
        signal.addEventListener('abort', abortListener, { once: true });

        await sleep(1000);    // sleep to delay responding to the message, so the abort fires first
        reply({ foo: '1', bar: '2' });
      });
      receiver.subscribe(handler);

      try {
        const { result, abort } = sender.send({ foo: 1, bar: 2 });
        // flushes the promise queue, so the `receiver.subscribe` handler actually gets called
        await jest.advanceTimersByTimeAsync(100);
        abort();
        await jest.advanceTimersByTimeAsync(100);
        await result;
      }
      catch (err) {
        console.log(err);
        expect(err).toBeInstanceOf(DOMException);
        expect((err as Error).name).toEqual('AbortError');
      }

      expect(handler).toHaveBeenCalled();
      expect(abortListener).toHaveBeenCalled();

      jest.useRealTimers();
    }, 100000);
  });

  // xdescribe('', async () => {

  // });

  // xdescribe('', async () => {

  // });
});
