/**
 * @module
 * @mergeModuleWith Core
 */

/** @inline */
type EventMap = {
  [event: string]: any;
};
/**
 * A {@link EventEmitter} listener `function`.
 * @public
 * @typeParam T - The structure of the event payload
 */
export type EventListener<T> = T extends void ? () => void : (event: T) => void;

/**
 * Subscription-only view of an {@link EventEmitter}, exposing just `on`/`off`.
 * Useful for handing consumers a way to listen for events without also
 * granting them the ability to `emit` or `relay` events.
 * @group EventEmitter
 * @typeParam E - A map of possible events where the `key` is the event name
 * and the `value` is the event payload structure
 */
export interface Emitter<E extends EventMap> {
  on: (...args: Parameters<EventEmitter<E>['on']>) => void;
  off: (...args: Parameters<EventEmitter<E>['off']>) => void;
}

/**
 * An object that implements the publish-subscribe pattern, allowing different parts of an 
 * application to communicate asynchronously through events
 * @group EventEmitter
 * @typeParam Events - A map of possible events where the `key` is the event name
 * and the `value` is the event payload structure
 */
export class EventEmitter<Events extends EventMap> {
  /** @internal */
  listeners: { [K in keyof Events]?: Array<EventListener<Events[K]>> } = {};

  /**
   * Binds a listener function to a specific event
   * @typeParam K - The event name (also the key within `Events`)
   */
  on<K extends keyof Events>(eventName: K, handler: EventListener<Events[K]>): this {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
    }
    this.listeners[eventName]!.push(handler);

    return this;
  }

  /**
   * When a `handler` is provided, it is removed as a listener to the specified event `eventName`.
   * 
   * When no `handler` is provided, all listeners for the specified event are removed.
   * 
   * @typeParam K - The event name (also the key within `Events`)
   * 
   * @remarks
   * This method will no-op if the `function` provided as `handler` is not a registered listener
   * to the provided `eventName`
   */
  off<K extends keyof Events>(eventName: K, handler?: EventListener<Events[K]>): this {
    if (!this.listeners[eventName]) {
      return this;
    }

    if (!handler) {
      delete this.listeners[eventName];
      return this;
    }

    this.listeners[eventName] = this.listeners[eventName]?.filter(l => l !== handler);
    return this;
  }

  /**
   * Synchronously calls each of the listeners registered for the event named `eventName`, 
   * in the order they were registered, passing the supplied `data` to each.
   * 
   * @typeParam K - The event name (also the key within `Events`)
   * 
   * @remarks
   * `data` will be type checked to match the `Events` map. A `TS` error will occur if the
   * `object` provided as `data` does not match the type defined at `Events[K]`.
   */
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

  /**
   * Relays the specified events in `events` from `emitter` (or "relay-ee"). The "relay-er" (`this`) will relay all
   * events emitted from the "relay-ee"
   * 
   * @typeParam FromEvents - The `Events` map from the "relay-ee" `emitter`. This type param will
   * be inferred and does not need to be explicitly provided.
   * @typeParam K - The event name (also the key within `Events` OR `FromEvents`)
   * 
   * @remarks
   * The possibility of both emitters `Events` maps containing the same `key` (event name) has not been tested.
   * 
   * @example
   * ```ts
   * type WeekdayEvents = { "work": { foo: number } };
   * type WeekendEvents = { "play": { bar: string } };
   * 
   * const weekday = new EventEmitter<WeekdayEvents>();
   * const weekend = new EventEmitter<WeekendEvents>();
   * 
   * // for the types to work properly, the `Events` map of the relaying `EventEmitter`
   * // must contain all events which will be relayed
   * const daily = new EventEmitter<WeekdayEvents & WeekendEvents>();
   * daily.relay(weekday, ['work']);
   * daily.relay(weekend, ['play']);
   * 
   * daily.on('play', (({ bar }) => { console.log(`yay fun ${bar}!`) });
   * daily.on('work', (({ foo }) => { console.log(`boooo ${foo}!`) });
   * 
   * weekday.emit('work', { foo: 1 });    // will fire `daily.on('work', ...)`;
   * ```
   */
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
}
