import { pause } from '@okta/auth-foundation';
import { LocalBroadcastChannel } from 'src/utils/LocalBroadcastChannel';
import { OrchestrationBridge } from 'src/orchestrators/HostOrchestrator/OrchestrationBridge';

const listeners: EventListenerOrEventListenerObject[] = [];

describe.skip('OrchestrationBridge', () => {
  let receiver: OrchestrationBridge;
  let sender: OrchestrationBridge;

  const _actualAddEventListener = window.addEventListener;
  jest.spyOn(window, 'addEventListener').mockImplementation((...args) => {
    const [eventName, listener] = args;
    if (eventName === 'message') {
      listeners.push(listener);
    }
    _actualAddEventListener(...args);
  });

  beforeEach(() => {
    jest.spyOn(window, 'postMessage').mockImplementation((data) => {
      const msg = new MessageEvent('message', {
        data,
        origin: location.href,
        source: window,
      });

      window.dispatchEvent(msg);
    });
    // jest MessageEvents all return `isTrusted: false`, only way to override this
    jest.spyOn((LocalBroadcastChannel.prototype as any), 'isTrustedMessage').mockReturnValue(true);

    receiver = new OrchestrationBridge('test');
    sender = new OrchestrationBridge('test');
  });

  afterEach(() => {
    receiver.close();
    sender.close();

    for (const l of listeners) {
      window.removeEventListener('message', l);
    }
  });

  it('sends a message between bus instances', async () => {
    receiver.subscribe(async (event, reply) => {
      console.log('1234');
      reply({ message: 'PONG' });
    });

    const result = await sender.send({ eventName: 'PING', data: undefined }).result;
    expect(result).toEqual({ message: 'PONG' });
  });

  it('handles processing multiple messages at once', async () => {
    receiver.subscribe(async (message, reply) => {
      // @ts-expect-error // TODO - fix this
      if (message?.data?.foo) {
        reply({ bar: 'baz' });
      }
      else {
        reply({ foo: 'bar' });
      }
    });

    const promise = sender.send({ eventName: 'PING', data: undefined }).result;
    await pause(100);
    const result2 = await sender.send({ eventName: 'PING', data: undefined }).result; 
    const result1 = await promise;

    expect(result1).toEqual({ bar: 'baz' });
    expect(result2).toEqual({ foo: 'bar' });
  }, 10000);

  it('handles canceling a message', async () => {
    const subscribe = jest.fn().mockImplementation(async (message) => {
      console.log('message: ', message);
      await pause(100);
      message.reply({ bar: 'baz' });
    });

    receiver.subscribe(subscribe);

    const { result, cancel } = sender.send({ eventName: 'PING', data: undefined });
    await pause(50);
    cancel();

    expect(subscribe).toHaveBeenCalledTimes(1);
    await expect(result).rejects.toEqual('canceled here');
  });

  it('closes all active channels', async () => {

  });
});