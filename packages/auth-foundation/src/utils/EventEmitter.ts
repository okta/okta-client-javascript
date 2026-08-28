/**
 * @module
 * @mergeModuleWith Core
 */

type EventMap = {
  [event: string]: any;
};
type EventListener<T> = T extends void ? () => void : (event: T) => void;

type EventListenerOptions = { signal: AbortSignal }

/**
 * @group EventEmitter
 */
export interface Emitter<E extends EventMap> {
  on: (...args: Parameters<EventEmitter<E>['on']>) => void;
  off: (...args: Parameters<EventEmitter<E>['off']>) => void;
}

/**
 * @group EventEmitter
 */
export class EventEmitter<Events extends EventMap> {
  listeners: { [K in keyof Events]?: Array<EventListener<Events[K]>> } = {};
  signals: WeakMap<Function, { signal: AbortSignal, abortHandler: () => void }> = new WeakMap();

  on<K extends keyof Events>(
    eventName: K,
    handler: EventListener<Events[K]>,
    options: Partial<EventListenerOptions> = {}
  ): this {
    const { signal } = options;

    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
    }
    this.listeners[eventName]!.push(handler);

    if (signal && !signal?.aborted) {
      const abortHandler = () => {
        this.off(eventName, handler);
      };
      signal.addEventListener('abort', abortHandler, { once: true });
      this.signals.set(handler, { signal, abortHandler });
    }

    return this;
  }

  off<K extends keyof Events>(eventName: K, handler?: EventListener<Events[K]>): this {
    if (!this.listeners[eventName]) {
      return this;
    }

    if (!handler) {
      this.listeners[eventName]?.forEach(h => this.detachSignal(h));
      delete this.listeners[eventName];
      return this;
    }

    this.detachSignal(handler);
    this.listeners[eventName] = this.listeners[eventName]?.filter(l => l !== handler);
    return this;
  }

  /** @internal removes the `AbortSignal` registration (if any) associated with `handler` */
  protected detachSignal (handler: EventListener<any>): void {
    const entry = this.signals.get(handler);
    if (entry) {
      entry.signal.removeEventListener('abort', entry.abortHandler);
      this.signals.delete(handler);
    }
  }

  emit<K extends keyof Events>(eventName: K, data: Events[K]): void;
  emit<K extends keyof Events>(eventName: K): void;
  emit<K extends keyof Events>(eventName: K, data?: Events[K]): void {
    for (const listener of (this.listeners[eventName] ?? [])) {
      try { 
        if (data !== undefined) {
          (listener as (data: Events[K]) => void)(data);
        }
        else {
          (listener as () => void)();
        }
      }
      // eslint-disable-next-line no-empty
      catch (err) {

      }
    }
  }

  // `K` is the intersection of both emitter's Event type
  relay<FromEvents extends EventMap, K extends keyof Events & keyof FromEvents = keyof Events & keyof FromEvents> (
    emitter: EventEmitter<FromEvents>,
    events: K[]
  ): void {
    for (const event of events) {
      type EventPayload = Events[typeof event] & FromEvents[typeof event];
      const handler = ((...args: any[])=> {
        if (args.length === 0) {
          this.emit(event);
        }
        else {
          this.emit(event, args[0] as EventPayload);
        }
      }) as EventListener<FromEvents[typeof event]>;    // casting required because `EventListener` also accepts `void`
      emitter.on(event, handler);
    }
  }

  clear (): this {
    (Object.keys(this.listeners) as (keyof Events)[]).forEach(eventName => this.off(eventName));
    return this;
  }
}