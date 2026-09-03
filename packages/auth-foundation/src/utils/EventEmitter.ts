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
  // scoped per-event, since the same `handler` function reference may be registered against
  // multiple events (or reused across `on()` calls) with different signals attached
  signals: Map<keyof Events, WeakMap<(...arg: any[]) => void, { signal: AbortSignal, abortHandler: () => void }>> = new Map();

  on<K extends keyof Events>(
    eventName: K,
    handler: EventListener<Events[K]>,
    options: Partial<EventListenerOptions> = {}
  ): this {
    const { signal } = options;

    if (signal?.aborted) {
      // if the provided `AbortSignal` has already been aborted, do not bind listener
      return this;
    }

    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
    }
    this.listeners[eventName]!.push(handler);

    if (signal) {
      const abortHandler = () => {
        this.off(eventName, handler);
      };
      signal.addEventListener('abort', abortHandler, { once: true });

      if (!this.signals.has(eventName)) {
        this.signals.set(eventName, new WeakMap());
      }
      this.signals.get(eventName)!.set(handler, { signal, abortHandler });
    }

    return this;
  }

  off<K extends keyof Events>(eventName: K, handler?: EventListener<Events[K]>): this {
    if (!this.listeners[eventName]) {
      return this;
    }

    if (!handler) {
      this.listeners[eventName]?.forEach(h => this.detachSignal(eventName, h));
      delete this.listeners[eventName];
      return this;
    }

    this.detachSignal(eventName, handler);
    this.listeners[eventName] = this.listeners[eventName]?.filter(l => l !== handler);
    return this;
  }

  /** @internal removes the `AbortSignal` registration (if any) associated with `handler` for `eventName` */
  protected detachSignal<K extends keyof Events> (eventName: K, handler: EventListener<any>): void {
    const entry = this.signals.get(eventName)?.get(handler);
    if (entry) {
      entry.signal.removeEventListener('abort', entry.abortHandler);
      this.signals.get(eventName)!.delete(handler);
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
