import type { BroadcastChannelLike } from '../types/index.ts';
import { shortID } from '../crypto/index.ts';
import { AuthSdkError } from '../errors/AuthSdkError.ts';

/** @useDeclaredType */
type TypeMap = Record<string, any>;
// TODO: revisit this
// type TypeMap = Record<string, Record<string, any>>;

/**
 * A bridge for passing messages between a `TaskHandler` and a `Requestor`. The `Requestor` is "asking" the `TaskHandler`
 * To perform a `Task` on it's behave. Loosely based on TCP
 *
 * When a `TaskRequest` is received, a separate {@link TaskBridge.TaskChannel} is created between the `Handler` and 
 * the `Requestor` to communicate the status of the specific `Task`. Once the `Task` has completed the response will 
 * be sent to the `Requestor` via the {@link TaskBridge.TaskChannel} and the channel will be closed.
 * 
 * The `TaskHandler` will broadcast a heartbeat, indicating it's still alive, to all pending {@link TaskBridge.TaskChannel}s.
 * If a `Requestor` does not receive a response or heartbeat within a `timeout` interval, a Timeout error is thrown
 * 
 * @typeParam M - A TypeMap of message payload structure for `TaskRequests`
 * @typeParam R - A TypeMap of message payload structure for `TaskReponses`
 */
export abstract class TaskBridge<M extends TypeMap, R extends TypeMap> {
  // NOTE: defined in namespace
  // static readonly BridgeVersion

  /**
   * @internal
   * Reference to the 
   */
  #channel: TaskBridge.BridgeChannel<M[keyof M]> | undefined;
  #pending: Map<string, TaskBridge.Task<any, any>> = new Map();
  #heartbeatInt: ReturnType<typeof setInterval> | null = null;
  public heartbeatInterval = 1000;

  constructor (
    public name: string,
  ) {
  }

  /**
   * A "public" channel opened on a known key (`this.name`) to send/receive task requests
   * 
   * @remarks
   * This has been written with an assumption there is one only {@link TaskBridge} listening on
   * this public channel and responding to messages. There is currently no "message handling arbitartion"
   */
  protected abstract createBridgeChannel(): TaskBridge.BridgeChannel<M[keyof M]>;

  protected abstract createTaskChannel<K extends keyof M & keyof R>(name: string): TaskBridge.TaskChannel<R[K]>;

  protected onTick () {
    for (const message of this.#pending.values()) {
      message.reply('PENDING');
    }
  }

  protected pushMessage (message: TaskBridge.Task<any, any> ) {
    console.log('pushMessage called');
    this.#pending.set(message.id, message);
    // if there is no active heartbeat, start one
    if (this.#heartbeatInt === null) {
      this.#heartbeatInt = setInterval(this.onTick.bind(this), this.heartbeatInterval);
    }
  }

  protected clearMessage (messageId: string) {
    this.#pending.delete(messageId);
    // end the heartbeat if there are no more pending requests
    if (this.#heartbeatInt !== null && this.#pending.size === 0) {
      clearInterval(this.#heartbeatInt);
      this.#heartbeatInt = null;
    }
  }

  send<K extends keyof M & keyof R>(message: M[K], options: TaskBridge.TaskOptions = {}): TaskBridge.TaskResponse<R[K]> {
    const requestId = shortID();
    const requestChannel: TaskBridge.BridgeChannel<M[keyof M]> = this.createBridgeChannel();
    const responseChannel: TaskBridge.TaskChannel<R[K]> = this.createTaskChannel(requestId);
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const request = new TaskBridge.Task<M[K], R[K]>({
      __v: TaskBridge.BridgeVersion,
      id: requestId,
      message: message,
      channel: responseChannel
    });
    this.#pending.set(request.id, request);

    let abortHandler: () => void;
    const result = (new Promise<R[K]>((resolve, reject) => {
      const resetTimeoutTimer = () => {
        console.log('reset called')

        // `options.timeout` set to `null` disables the timeout mechanism
        if (options.timeout === null) {
          return;
        }

        if (timeoutId !== null) {
          clearTimeout(timeoutId);
        }
        // TODO: error type
        timeoutId = setTimeout(() => reject(
          new TaskBridge.TimeoutError('timeout')
        ), options.timeout ?? 5000);
      };
      // sets timeout timer
      resetTimeoutTimer();

      // forces the pending promise to reject, so resources clean up if the request is aborted
      abortHandler = () => {
        console.log('thrown abort error')
        reject(new DOMException('Aborted', 'AbortError'));
      };
      request.signal.addEventListener('abort', abortHandler);

      // This channel is meant for the Receiver to send the results (aka `HandlerMessage<M>` messages)
      // ignore all Requestor events received (aka `RequestorMessage`)
      responseChannel.onmessage = (event) => {
        if (request.signal.aborted || 'action' in event.data) {
          return;   // ignore message
        }

        // event type is now `HandlerMessage<M>`
        const { status } = event.data;
        switch (status) {
          case 'SUCCESS':
            return resolve(event.data.data);

          case 'FAILED':
            // still resolves the resulting promise, the implementor should decide if this is an thrown error or not
            return resolve(event.data.data);

          case 'PENDING':
            // defer the timeout timer when a heartbeat is received (host is still working)
            resetTimeoutTimer();

            break;
          case 'ABORTED':
            // reject(new DOMException('Aborted', 'AbortError'));
            console.log('here')
            request.abort('Host Aborted');
            break;
        }
      };

      requestChannel.postMessage({ ...request.send(), __v: TaskBridge.BridgeVersion });
      requestChannel.close();
    }))
    .finally(() => {
      console.log('in finally', timeoutId)
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      requestChannel.close();
      responseChannel.close();
      request.signal.removeEventListener('abort', abortHandler);
      this.#pending.delete(request.id);
    });

    // TODO: review
    const abort = () => {
      responseChannel.postMessage({ action: 'CANCEL', __v: TaskBridge.BridgeVersion });
      request.controller.abort('cancel');
    };

    return { result, abort };
  }

  subscribe<K extends keyof M & keyof R>(handler: TaskBridge.TaskHandler<M, R>) {
    this.#channel = this.createBridgeChannel();
    this.#channel.onmessage = async (evt, reply) => {
      console.log('onmessage: ', evt.data, reply);
      const { requestId, __v, ...rest } = evt.data;

      if (!requestId) {
        return;
      }

      const responseChannel: TaskBridge.TaskChannel<R[K]> = this.createTaskChannel(requestId);
      const message = new TaskBridge.Task<any, any>({
        __v: __v ?? '1',    // "version 1" does not set this value, therefore it will be undefined
        id: requestId,
        message: rest,
        channel: responseChannel,
        reply
      });

      this.pushMessage(message);

      responseChannel.onmessage = (event) => {
        console.log('[response channel]', event.data);

        // The Requestor may send a `RequestorMessage` (like `CANCEL`) to the Subscriber
        // ignore `HandlerMessage<M>` messages - only the Requestor cares about those
        if ('status' in event.data) {
          return;   // ignore message
        }

        // event type is now `RequestorMessage`
        switch (event.data.action) {
          case 'CANCEL':
            // TODO: probably don't need to reply, just cancel action, if possible
            // responseChannel.postMessage({ status: 'CANCELED' });
            console.log('received cancel')
            message.abort('cancel');
            break;
        }
      };

      try {
        console.log('in try')
        message.reply('PENDING');     // send instantaneous `PENDING` message, essentially a "received" event
        console.log('sent PENDING')
        await handler(
          evt.data,                                             // message payload
          (response) => message.reply(response, 'SUCCESS'),     // reply fn
          { signal: message.signal }                            // options
        );
        console.log('handler done')
      }
      catch (err) {
        if (err instanceof DOMException) {
          if (err.name === 'AbortError') {
            // task was aborted, do nothing
            return null;
          }

          if (err.name === 'InvalidStateError') {
            // this is error is thrown if a `.postMessage` is attempted after the channel is closed
            // this can happen when the `handler` function attempts to `reply()` after `.close()`
            // is called. Ignore the error, the `AbortSignal` is provided to the `handler` for
            // if needed
            return null;
          }
        }

        if (err instanceof Error) {
          message.reply({ error: err.message }, 'FAILED');
        }
      }
      finally {
        console.log('finally')
        this.clearMessage(requestId);
        responseChannel.close();
      }
    };
  }

  /**
   * Returns the number of pending tasks
   */
  get pending (): number {
    return this.#pending.size;
  }

  close () {
    this.#channel?.close();
    for (const message of this.#pending.values()) {
      message.abort();
      message.channel.close();
      this.clearMessage(message.id);
    }
    // this.#pending.clear();
    // if (this.#heartbeatInt) {
    //   clearInterval(this.#heartbeatInt);
    // }
  }
}

export namespace TaskBridge {
  // NOTE: update this value when the payload structure of the TaskBridge changes
  export const BridgeVersion = 2;

  /**
   * Possible `status` values indicating the process of an orchestrated request
   */
  export type TaskStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'ABORTED';

  export type BridgeVersions = 1 | 2;

  /**
   * The payload of a message sent from Subscriber to Requestor, indicating the process or result of a request
   */
  export type HandlerMessage<M extends TypeMap> = {
    status: 'SUCCESS';
    data: M;
    __v: BridgeVersions;
  } | {
    status: 'FAILED'
    data: M;
    __v: BridgeVersions;
  } | {
    status: 'PENDING'
    __v: BridgeVersions;
  } | {
    status: 'ABORTED'
    __v: BridgeVersions;
  }

  /**
   * The payload of a message sent from Requestor to Subscriber to alter the outcome of a request (`CANCEL` for example)
   */
  export type RequestorMessage = {
    action: string;
  };

  /**
   * A channel with the purpose of receiving a request from a Requestor
   */
  export type BridgeChannel<M extends TypeMap> = BroadcastChannelLike<M & { requestId: string; __v: BridgeVersions }>;

  /**
   * A channel created to communicate the results of a pending request (will be isolated to specific Subscriber and Requestor)
   */
  export type TaskChannel<M extends TypeMap> = BroadcastChannelLike<
    (RequestorMessage | HandlerMessage<M>) & { __v: BridgeVersions }
  >;

  /**
   * @internal
   * 
   * @typeParam Q - re(Q)uest event payload
   * @typeParam S - re(S)ponse event payload
   */
  export type TaskInit<Q extends TypeMap, S extends TypeMap> = {
    __v: BridgeVersions;
    id: string;
    message: Q;
    channel: TaskChannel<S>;
    reply?: (response: any) => void;
  };

  /**
   * @internal
   * 
   * @typeParam Q - re(Q)uest event payload
   * @typeParam S - re(S)ponse event payload
   */
  export class Task<Q extends TypeMap, S extends TypeMap> {
    public __v: TaskInit<Q, S>['__v'];
    public id: TaskInit<Q, S>['id'];
    public message: TaskInit<Q, S>['message'];
    public channel: TaskInit<Q, S>['channel'];
    private replyFn: TaskInit<Q, S>['reply'];
    public controller: AbortController = new AbortController();

    constructor ({ id, message, channel, __v, reply }: TaskInit<Q, S>) {
      this.id = id;
      this.message = message;
      this.channel = channel;
      this.__v = __v;
      this.replyFn = reply;
    }

    send () {
      return { requestId: this.id, __v: this.__v, ...this.message };
    }

    reply (data: S, status: TaskBridge.TaskStatus): void;
    reply (status: 'PENDING' | 'ABORTED'): void;
    reply (data: S | 'PENDING' | 'ABORTED', status: TaskBridge.TaskStatus = 'SUCCESS') {
      const fn = this.replyFn ?? this.channel.postMessage.bind(this.channel);

      if (data === 'PENDING' || status === 'PENDING') {
        // only send `PENDING` heartbeats when using <= v2 of the TaskBridge payload structure
        if (this.__v === 2) {
          fn({ status: 'PENDING', __v: this.__v } satisfies HandlerMessage<S>);
        }
      }
      else if (data === 'ABORTED' || status === 'ABORTED') {
        // only send `PENDING` heartbeats when using <= v2 of the TaskBridge payload structure
        if (this.__v === 2) {
          fn({ status: 'ABORTED', __v: this.__v } satisfies HandlerMessage<S>);
        }
      }
      else {
        // TODO: remove this condition - OKTA-1053515
        if (this.__v < 2) {
          // @ts-expect-error - this condition will be removed once rollout is complete
          fn(data);
        }
        else {
          fn({ status, data, __v: this.__v });
        }
      }
    }

    abort (...args: Parameters<AbortController['abort']>) {
      this.reply('ABORTED');
      return this.controller.abort(...args);
    }

    get signal (): AbortSignal {
      return this.controller.signal;
    }
  }

  /**
   * @internal
   */
  export type TaskOptions = {
    timeout?: number | null;
    signal?: AbortSignal;
  };

  /**
   * @internal
   */
  export type TaskResponse<R extends TypeMap> = {
    result: Promise<R>;
    abort: () => void;
  };

  /**
   * @internal
   */
  export type TaskHandler<M extends TypeMap, R extends TypeMap> = (
    message: M[keyof M],
    reply: (response: R[keyof R]) => any,
    options?: { signal: AbortSignal }
  ) => any;

  /**
   * @group Errors
   */
  export class TimeoutError extends AuthSdkError {
    #timeout: boolean = false;

    constructor (...args: ConstructorParameters<typeof AuthSdkError>) {
      const [message, ...rest] = args;
      super(message ?? 'timeout', ...rest);
      this.#timeout = true;
    }

    get timeout (): boolean {
      return this.#timeout;
    }
  };
}
