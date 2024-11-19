type EmitterEvent = Record<string, any>;
type EmitterEventHandler = (event: EmitterEvent) => void;

export class EventEmitter {
  listeners: Record<string, EmitterEventHandler[]> = {};

  on (eventName: string, handler: (event: EmitterEvent) => void): this {
    const l = this.listeners[eventName];
    if (l) {
      l.push(handler);
    }
    else {
      this.listeners[eventName] = [handler];
    }
    return this;
  }

  off (eventName: string, handler?: (event: EmitterEvent) => void): this {
    if (!handler) {
      delete this.listeners[eventName];
      return this;
    }

    const idx = this.listeners?.[eventName]?.findIndex(h => h === handler) ?? -1;
    if (idx >= 0) {
      this.listeners[eventName].splice(idx, 1);
    }
    return this;
  }

  protected emit (eventName: string, data: EmitterEvent): void {
    for (const listener of (this.listeners[eventName] ?? [])) {
      // eslint-disable-next-line no-empty
      try { listener(data); } catch(err) {}
    }
  }

  // relays events fired from one emitter through another
  relay (emitter: EventEmitter, events: string[]) {
    for (const event of events) {
      emitter.on(event, (...eventData) => {
        this.emit(event, ...eventData);
      });
    }
  }
}
