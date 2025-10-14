import { EventEmitter } from 'src/utils/EventEmitter';

describe('EventEmitter', () => {
  it('should register handlers, emit events and unregister handlers', () => {
    const emitter = new EventEmitter();
    const listener1 = jest.fn();
    const listener2 = jest.fn();

    // emit event with no registered handlers at all
    // @ts-expect-error `.emit` is protected method
    emitter.emit('bar', { foo: 'foo '});

    // register handlers
    emitter.on('foo', listener1);
    emitter.on('foo', listener2);

    // emit event with no handlers registered for specific event
    // @ts-expect-error `.emit` is protected method
    emitter.emit('bar', { foo: 'foo '});
    expect(listener1).not.toHaveBeenCalled();
    expect(listener2).not.toHaveBeenCalled();

    // emit event with registered handlers
    // @ts-expect-error `.emit` is protected method
    emitter.emit('foo', { bar: 'bar' });
    expect(listener1).toHaveBeenCalledWith({ bar: 'bar' });
    expect(listener2).toHaveBeenCalledWith({ bar: 'bar' });

    // unregister a handler and clear jest mocks
    emitter.off('foo', listener1);
    listener1.mockClear();
    listener2.mockClear();

    // emit event again (with a single registered handler)
    // @ts-expect-error `.emit` is protected method
    emitter.emit('foo', { baz: 'baz' });
    expect(listener1).not.toHaveBeenCalled();
    expect(listener2).toHaveBeenCalledWith({ baz: 'baz' });

    // re-register listener1
    emitter.on('foo', listener1);
    listener1.mockClear();
    listener2.mockClear();
    // @ts-expect-error `.emit` is protected method
    emitter.emit('foo', { bar: 'bar' });
    expect(listener1).toHaveBeenCalledWith({ bar: 'bar' });
    expect(listener2).toHaveBeenCalledWith({ bar: 'bar' });

    // unregister all events when `.off()` is called without a specific handler
    listener1.mockClear();
    listener2.mockClear();
    emitter.off('foo');
    // @ts-expect-error `.emit` is protected method
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

    // @ts-expect-error `.emit` is protected method
    inner.emit('foo', { bar: 'baz' });
    expect(listener).not.toHaveBeenCalled();

    // @ts-expect-error `.emit` is protected method
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

    // @ts-expect-error `.emit` is protected method
    emitter.emit('foo', { bar: 'baz' });

    expect(handler2).toHaveBeenCalled();
  });
});
