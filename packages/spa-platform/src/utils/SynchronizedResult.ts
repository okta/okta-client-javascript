/**
 * @packageDocumentation
 * @internal
 */

// References:
// https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API
// https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API

export type SynchronizedResultOptions<T = any, R = any> = {
  timeout: number;
  seralizer?: (obj: T) => R;
  deseralizer?: (input: R) => T;
}

const defaultOptions: SynchronizedResultOptions = {
  timeout: 8000,
};

type BroadcastEnvelope<R> =
  | { ok: true, value: R }
  | { ok: false, error: string };

/**
 * Synchronizes the result of an `async` action between multiple subscribers
 *
 * `T` is return type of `task()`
 * `R` is raw type used to transfer `task()` result between tabs
 *
 * @remarks
 * Current implementation only works in browser environments
 */
export class SynchronizedResult<T, R = T> {
  readonly name: string;
  private task: () => Promise<T>;
  private channel: BroadcastChannel;
  private options: SynchronizedResultOptions<T, R>;

  constructor (name: string, task: () => Promise<T>, options: Partial<SynchronizedResultOptions<T, R>> = {}) {
    this.name = name;
    this.task = task;
    this.channel = new BroadcastChannel(name);
    this.options = { ...defaultOptions, ...options };
  }

  public async exec (): Promise<T> {
    const { seralizer, deseralizer, timeout } = this.options;

    let settled = false;
    let resolve!: (value: T) => void;
    let reject!: (err: unknown) => void;
    const result = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
    const controller = new AbortController();

    // single, persistent listener for this call's whole lifetime -- never torn down/re-armed mid-flight
    this.channel.onmessage = (event: MessageEvent<BroadcastEnvelope<R>>) => {
      if (settled) { return; }
      settled = true;
      controller.abort();   // no longer need our place in the lock queue
      const envelope = event.data;
      if (envelope.ok) {
        resolve(deseralizer ? deseralizer(envelope.value) : (envelope.value as unknown as T));
      }
      else {
        reject(new Error(envelope.error));
      }
    };

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error('Task was unable to fulfill'));
      }
    }, timeout);

    // every tab queues for the lock; the browser's FIFO queue hands it to the next tab
    // if the current holder disappears without finishing
    navigator.locks.request(this.name, { signal: controller.signal }, async () => {
      if (settled) {
        return;   // another tab's broadcast already resolved this call
      }
      try {
        const value = await this.task();
        if (!settled) {
          settled = true;
          resolve(value);
        }
        this.channel.postMessage({
          ok: true,
          value: seralizer ? seralizer(value) : (value as unknown as R)
        } satisfies BroadcastEnvelope<R>);
      }
      catch (err) {
        if (!settled) {
          settled = true;
          reject(err);
        }
        this.channel.postMessage({
          ok: false,
          error: err instanceof Error ? err.message : String(err)
        } satisfies BroadcastEnvelope<R>);
      }
    }).catch(() => {});   // AbortError from our own cancellation, or already settled -- nothing to do

    try {
      return await result;
    }
    finally {
      clearTimeout(timer);
      this.close();
    }
  }

  /**
   * Closes the underlying BroadcastChannel, useful for testing environments to avoid open handles
   *
   * @see
   * {@link https://jestjs.io/docs/cli#--detectopenhandles | jest --detectOpenHandles}
   */
  public close () {
    this.channel.close();
  }
}