/**
 * @packageDocumentation
 * @internal
 */

type QueueItem = {
  method: () => Promise<unknown>;
  resolve: (value?: any) => void;
  reject: (reason?: unknown) => void;
}

/** @internal */
export class PromiseQueue {
  queue: QueueItem[] = [];
  isRunning: boolean = false;

  get size () {
    return this.queue.length;
  }

  push<T> (method: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        method,
        resolve,
        reject
      });
      this.run();
    });
  }

  private async run (): Promise<void> {
    if (this.isRunning || this.queue.length === 0) {
      return;
    }

    this.isRunning = true;
    // no-non-null-assertion used because queue.shift() cannot
    // be undefined if queue is not empty (checked above)
    const { method, resolve, reject } = this.queue.shift()!;
    try {
      const result = await method();
      resolve(result);
    }
    catch (err) {
      reject(err);
    }
    finally {
      this.isRunning = false;
      this.run();
    }
  }
}