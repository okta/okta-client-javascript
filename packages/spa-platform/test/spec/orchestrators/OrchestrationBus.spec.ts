import { pause } from '@okta/auth-foundation';
import { SecureChannel } from 'src/utils/SecureChannel';
import { OrchestrationBus } from 'src/orchestrators/HostOrchestrator/OrchestrationBus';


type TestMessage = {
  foo?: string;
  bar?: string;
};

describe('OrchestrationBus', () => {
  let receiver: OrchestrationBus<TestMessage, TestMessage>;
  let sender: OrchestrationBus<TestMessage, TestMessage>;

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
    jest.spyOn((SecureChannel.prototype as any), 'isTrustedMessage').mockReturnValue(true);

    receiver = new OrchestrationBus('test');
    sender = new OrchestrationBus('test');
  });

  afterEach(() => {
    receiver.close();
    sender.close();
  });

  it('sends a message between bus instances', async () => {
    receiver.subscribe(async (message) => {
      message.reply({ bar: 'baz' });
    });

    const result = await sender.send({ foo: 'bar' }).result;
    expect(result).toEqual({ bar: 'baz' });
  });

  it('handles processing multiple messages at once', async () => {
    receiver.subscribe(async (message) => {
      if (message.data.foo) {
        message.reply({ bar: 'baz' });
      }
      else {
        message.reply({ foo: 'bar' });
      }
    });

    const promise = sender.send({ foo: 'bar' }).result;
    await pause(100);
    const result2 = await sender.send({ bar: 'baz' }).result; 
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

    const { result, cancel } = sender.send({ foo: 'bar' });
    await pause(50);
    cancel();

    expect(subscribe).toHaveBeenCalledTimes(1);
    await expect(result).rejects.toEqual('canceled here');
  });

  it('closes all active channels', async () => {

  });
});