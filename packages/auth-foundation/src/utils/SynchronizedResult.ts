
// References:
// https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API
// https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API

export type SynchronizedResultOptions<T = any, R = any> = {
  timeout: number;
  lockFreedDelay: number;
  retries: number;
  seralizer?: (obj: T) => R;
  deseralizer?: (input: R) => T;
}

const defaultOptions: SynchronizedResultOptions = {
  // timeout: 3000,
  timeout: 8000,    // TODO: reduce value, for testing
  lockFreedDelay: 500,
  retries: 2,
};

function sleep (ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
  private options: SynchronizedResultOptions<T, R> = {...defaultOptions};

  constructor (name: string, task: () => Promise<T>, options: Partial<SynchronizedResultOptions<T, R>> = {}) {
    this.name = name;
    this.task = task;
    this.channel = new BroadcastChannel(name);
    this.options = {...defaultOptions, ...options};
  }

  private onResultFromOtherTab (): Promise<T> {
    const { deseralizer } = this.options;
    return new Promise<T>((resolve) => {
      this.channel.onmessage = (event) => {
        const item = deseralizer ? deseralizer(event.data) : event.data;
        resolve(item);
      };
    });
  }

  private async onLockFreedPlusDelay (): Promise<'FREED'> {
    await navigator.locks.request(this.name, async () => {});
    // wait short delay to allow time for message to broadcast from other tab
    await sleep(this.options.lockFreedDelay);
    return 'FREED';
  }

  private async onTimeout (): Promise<'TIMEOUT'> {
    await sleep(this.options.timeout);
    return 'TIMEOUT';
  }

  private async whenLockIsTaken (): Promise<T> {
    const { retries } = this.options;

    const result = await Promise.race([
      this.onResultFromOtherTab(),            // waits to receive result from other tab's broadcast
      this.onLockFreedPlusDelay(),            // waits for lock to free (with short delay after being freed/granted)
      this.onTimeout()                        // overall timeout
    ]);

    // unbind listener to prevent additional messages
    this.channel.onmessage = () => {};

    if (result === 'FREED' || result === 'TIMEOUT') {
      if (retries > 0) {
        return this.exec();
      }
      else {
        throw new Error('Task was unable to fulfill');
      }
    }

    return result;
  }

  private async whenLockIsGranted (): Promise<T> {
    const { seralizer } = this.options;

    let result: T;
    try {
      result = await this.task();
    }
    catch (err) {
      this.channel.postMessage(err);
      throw err;
    }

    this.channel.postMessage(seralizer ? seralizer(result) : result);
    return result;
  }

  public async exec (overrides: Partial<SynchronizedResultOptions<T, R>> = {}): Promise<T> {
    this.options = { ...this.options, ...overrides };
    return await navigator.locks.request(this.name, { ifAvailable: true }, async (lock) => {
      try {
        if (!lock) {
          return this.whenLockIsTaken();
        }

        return this.whenLockIsGranted();
      }
      catch (err) {
        // TODO: throw TabSync error?
      }
    });
  }
}