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
    this.channel.postMessage(message);
  }

  close () {
    this.channel.close();
  }
}

class TestBus extends TaskBridge<TestRequest, TestResponse> {

  protected createBridgeChannel (): TaskBridge.BridgeChannel<TestRequest[keyof TestRequest]> {
    return new TestChannel(this.name);
  }

  protected createTaskChannel<K extends keyof TestRequest & keyof TestResponse>(name: string): TaskBridge.TaskChannel<TestResponse[K]> {
    return new TestChannel(name);
  }
}


describe.skip('TaskBridge', () => {
  let receiver: TaskBridge<TestRequest, TestResponse>;
  let sender: TaskBridge<TestRequest, TestResponse>;

  beforeEach(() => {
    receiver = new TestBus('test');
    sender = new TestBus('test');
  });

  afterEach(() => {
    receiver.close();
    sender.close();
  });

  describe('test', () => {
    it('sends and receives messages', async () => {
      const channel = new BroadcastChannel('test');
      channel.onmessage = (event) => {
        console.log('[monitor]: ', event.data);
      };

      receiver.subscribe(async (message, reply) => {
        console.log('handler called');
        reply({ foo: '2', bar: '1' });
      });
  
      const result = await sender.send({ foo: 1, bar: 2 }).result;
      expect(result).toEqual({ bar: 'baz' });

      channel.close();
    });
  });

  // xdescribe('', async () => {

  // });

  // xdescribe('', async () => {

  // });
});
