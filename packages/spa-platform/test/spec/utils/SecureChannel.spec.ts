import { SecureChannel } from 'src/utils/SecureChannel';


describe('SecureChannel', () => {
  beforeEach(() => {
    jest.spyOn(window, 'postMessage').mockImplementation((data) => {
      const msg = new MessageEvent('message', {
        data,
        origin: location.href,
        source: window,
      });

      window.dispatchEvent(msg);
    });
  });

  it('can send and receive messages between channels', () => {
    const sender = new SecureChannel('Test', location.href);
    const receiver = new SecureChannel('Test');
    const onMsgSpy = jest.fn();
    receiver.onmessage = onMsgSpy;
    // jest message events set `isTrusted` to `false`, couldn't find a way to set them to `true`
    jest.spyOn((receiver as any), 'isTrustedMessage').mockReturnValue(true);

    sender.postMessage({ foo: 'bar' });
    expect(onMsgSpy).toHaveBeenCalledTimes(1);
    expect(onMsgSpy).toHaveBeenCalledWith(expect.objectContaining({
      data: { foo: 'bar' }
    }), expect.any(Function));
  });

  it('fails to send messages when `targetOrigin` isn\'t defined', () => {
    const channel = new SecureChannel('Test');
    const listener = jest.fn();
    window.addEventListener('message', listener);
    channel.postMessage({ foo: 'bar' });
    expect(listener).not.toHaveBeenCalled();
    window.removeEventListener('message', listener);
  });

  it('ignores un-trusted message events', () => {
    const sender = new SecureChannel('Test', location.href);
    const receiver = new SecureChannel('Test');
    const onMsgSpy = jest.fn();
    receiver.onmessage = onMsgSpy;

    const listener = jest.fn();
    window.addEventListener('message', listener);
    
    sender.postMessage({ foo: 'bar' });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.lastCall[0]).toMatchObject({ isTrusted: false });
    expect(onMsgSpy).not.toHaveBeenCalled();
    window.removeEventListener('message', listener);
  });

  it('removes window listener when `.onmessage` is set to null', () => {
    
  });
});
