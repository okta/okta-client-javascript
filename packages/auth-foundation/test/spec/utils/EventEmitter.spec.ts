import { EventEmitter } from 'src/utils/EventEmitter';

describe('EventEmitter', () => {
  it('should register handlers, emit events and unregister handlers', () => {
    const emitter = new EventEmitter();
    const listener1 = jest.fn();
    const listener2 = jest.fn();

    // emit event with no registered handlers at all
    emitter.emit('bar', { foo: 'foo '});

    // register handlers
    emitter.on('foo', listener1);
    emitter.on('foo', listener2);

    // emit event with no handlers registered for specific event
    emitter.emit('bar', { foo: 'foo '});
    expect(listener1).not.toHaveBeenCalled();
    expect(listener2).not.toHaveBeenCalled();

    // emit event with registered handlers
    emitter.emit('foo', { bar: 'bar' });
    expect(listener1).toHaveBeenCalledWith({ bar: 'bar' });
    expect(listener2).toHaveBeenCalledWith({ bar: 'bar' });

    // unregister a handler and clear jest mocks
    emitter.off('foo', listener1);
    listener1.mockClear();
    listener2.mockClear();

    // emit event again (with a single registered handler)
    emitter.emit('foo', { baz: 'baz' });
    expect(listener1).not.toHaveBeenCalled();
    expect(listener2).toHaveBeenCalledWith({ baz: 'baz' });

    // re-register listener1
    emitter.on('foo', listener1);
    listener1.mockClear();
    listener2.mockClear();
    emitter.emit('foo', { bar: 'bar' });
    expect(listener1).toHaveBeenCalledWith({ bar: 'bar' });
    expect(listener2).toHaveBeenCalledWith({ bar: 'bar' });

    // unregister all events when `.off()` is called without a specific handler
    listener1.mockClear();
    listener2.mockClear();
    emitter.off('foo');
    emitter.emit('foo', { bar: 'bar' });
    expect(listener1).not.toHaveBeenCalled();
    expect(listener2).not.toHaveBeenCalled();
  });

  it('should relay events from one emitter to through another', () => {
    const inner = new EventEmitter();
    const outer = new EventEmitter();

    const listener = jest.fn();
    outer.on('test_event', listener);
    outer.relay(inner, ['test_event']);

    inner.emit('foo', { bar: 'baz' });
    expect(listener).not.toHaveBeenCalled();

    inner.emit('test_event', { bar: 'baz' });
    expect(listener).toHaveBeenCalledWith({ bar: 'baz' });
  });

  it('should not throw when .off is called on a unbound event', () => {
    const emitter = new EventEmitter();
    const fn = () => {};
    expect(() => emitter.off('foo')).not.toThrow();
    expect(() => emitter.off('foo', fn)).not.toThrow();
  });

  it('should not propagate errors throw in event handlers', () => {
    const emitter = new EventEmitter();
    const handler1 = () => {
      throw new Error('foo');
    };
    const handler2 = jest.fn();

    emitter.on('foo', handler1);
    emitter.on('foo', handler2);

    emitter.emit('foo', { bar: 'baz' });

    expect(handler2).toHaveBeenCalled();
  });

  describe('AbortSignal support (`{ signal }` option on `.on()`)', () => {
    it('removes the listener once the signal is aborted', () => {
      const emitter = new EventEmitter();
      const controller = new AbortController();
      const listener = jest.fn();

      emitter.on('foo', listener, { signal: controller.signal });
      emitter.emit('foo', { bar: 'baz' });
      expect(listener).toHaveBeenCalledTimes(1);

      controller.abort();
      emitter.emit('foo', { bar: 'baz' });
      expect(listener).toHaveBeenCalledTimes(1);   // not called again after abort
    });

    it('removes every listener sharing the same signal when it is aborted', () => {
      const emitter = new EventEmitter();
      const controller = new AbortController();
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      emitter.on('foo', listener1, { signal: controller.signal });
      emitter.on('bar', listener2, { signal: controller.signal });

      controller.abort();

      emitter.emit('foo', {});
      emitter.emit('bar', {});
      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();
    });

    it('does not register a listener if the signal is already aborted', () => {
      const emitter = new EventEmitter();
      const controller = new AbortController();
      controller.abort();
      const listener = jest.fn();

      emitter.on('foo', listener, { signal: controller.signal });
      emitter.emit('foo', { bar: 'baz' });
      expect(listener).not.toHaveBeenCalled();
    });

    it('tears down the abort listener when `.off()` is called directly, not just on abort', () => {
      const emitter = new EventEmitter();
      const controller = new AbortController();
      const listener = jest.fn();
      const removeEventListenerSpy = jest.spyOn(controller.signal, 'removeEventListener');

      emitter.on('foo', listener, { signal: controller.signal });
      emitter.off('foo', listener);
      expect(removeEventListenerSpy).toHaveBeenCalledWith('abort', expect.any(Function));

      // aborting afterward should not throw, nor re-invoke the already-removed listener
      expect(() => controller.abort()).not.toThrow();
      emitter.emit('foo', {});
      expect(listener).not.toHaveBeenCalled();
    });

    it('tears down signal registrations for every handler when `.off(event)` is called with no handler', () => {
      const emitter = new EventEmitter();
      const controller = new AbortController();
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      const removeEventListenerSpy = jest.spyOn(controller.signal, 'removeEventListener');

      emitter.on('foo', listener1, { signal: controller.signal });
      emitter.on('foo', listener2, { signal: controller.signal });

      emitter.off('foo');
      expect(removeEventListenerSpy).toHaveBeenCalledTimes(2);

      expect(() => controller.abort()).not.toThrow();
      emitter.emit('foo', {});
      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();
    });

    it('does not require a `signal` option', () => {
      const emitter = new EventEmitter();
      const listener = jest.fn();
      expect(() => emitter.on('foo', listener)).not.toThrow();
      emitter.emit('foo', {});
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('does not cross-contaminate signal cleanup when the same handler is shared across different events', () => {
      const emitter = new EventEmitter();
      const controllerA = new AbortController();
      const controllerB = new AbortController();
      const sharedHandler = jest.fn();
      const removeEventListenerSpyA = jest.spyOn(controllerA.signal, 'removeEventListener');
      const removeEventListenerSpyB = jest.spyOn(controllerB.signal, 'removeEventListener');

      emitter.on('foo', sharedHandler, { signal: controllerA.signal });
      emitter.on('bar', sharedHandler, { signal: controllerB.signal });

      // explicitly detach only the 'foo' registration
      emitter.off('foo', sharedHandler);
      expect(removeEventListenerSpyA).toHaveBeenCalledWith('abort', expect.any(Function));
      expect(removeEventListenerSpyB).not.toHaveBeenCalled();   // 'bar's own signal registration must be untouched

      // 'bar' should still be live...
      emitter.emit('bar', {});
      expect(sharedHandler).toHaveBeenCalledTimes(1);

      // ...and still correctly cleaned up when ITS OWN signal aborts
      controllerB.abort();
      emitter.emit('bar', {});
      expect(sharedHandler).toHaveBeenCalledTimes(1);   // not called again

      // aborting the already-detached controllerA afterward should not throw or double-invoke anything
      expect(() => controllerA.abort()).not.toThrow();
    });
  });

  describe('clear', () => {
    it('removes every listener for every event', () => {
      const emitter = new EventEmitter();
      const foo = jest.fn();
      const bar = jest.fn();
      emitter.on('foo', foo);
      emitter.on('bar', bar);

      emitter.clear();

      emitter.emit('foo', {});
      emitter.emit('bar', {});
      expect(foo).not.toHaveBeenCalled();
      expect(bar).not.toHaveBeenCalled();
    });

    it('tears down any signal registrations for the listeners it clears', () => {
      const emitter = new EventEmitter();
      const controller = new AbortController();
      const listener = jest.fn();
      const removeEventListenerSpy = jest.spyOn(controller.signal, 'removeEventListener');

      emitter.on('foo', listener, { signal: controller.signal });
      emitter.clear();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('abort', expect.any(Function));
    });
  });
});
