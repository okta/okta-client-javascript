import type { BroadcastChannelLike } from '../types/index.ts';
import { shortID } from '../crypto/index.ts';

/** @useDeclaredType */
type TypeMap = Record<string, any>;


/**
 * A messaging bus for passing messages between a Subscriber and a Requestor. Loosely based on TCP
 * 
 * Supports canceling requests and features a heartbeat-based request timeout mechanism
 * 
 * @typeParam M - Message payload structure
 * @typeParam R - Message Reponse payload structure
 */
export abstract class MessageBus<M extends TypeMap, R extends TypeMap> {
  // NOTE: defined in namespace
  // static readonly BusVersion

  #channel: MessageBus.ListenerChannel<M[keyof M]> | undefined;
  #pending: Map<string, MessageBus.BusRequest<any, any>> = new Map();
  #heartbeatInt: ReturnType<typeof setTimeout> | null = null;
  public heartbeatInterval = 1000;

  constructor (
    public name: string,
  ) {
  }

  protected abstract createListenerChannel(): MessageBus.ListenerChannel<M[keyof M]>;

  protected abstract createHandlerChannel<K extends keyof M & keyof R>(name: string): MessageBus.HandlerChannel<R[K]>;

  protected onTick () {
    for (const message of this.#pending.values()) {
      message.reply('PENDING');
    }
  }

  protected pushMessage (message: MessageBus.BusRequest<any, any> ) {
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

  send<K extends keyof M & keyof R>(message: M[K], options: MessageBus.BusMessageOptions = {}): MessageBus.BusResponse<R[K]> {
    const messageId = shortID();
    const requestChannel: MessageBus.ListenerChannel<M[keyof M]> = this.createListenerChannel();
    const responseChannel: MessageBus.HandlerChannel<R[K]> = this.createHandlerChannel(messageId);
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const request = new MessageBus.BusRequest<M[K], R[K]>({
      __v: MessageBus.BusVersion,
      id: messageId,
      data: message,
      channel: responseChannel
    });
    this.#pending.set(request.id, request);

    const result = (new Promise<R[K]>((resolve, reject) => {
      const setTimeoutTimer = () => {
        // `options.timeout` set to `null` disables the timeout mechanism
        if (options.timeout === null) {
          return;
        }

        if (timeoutId !== null) {
          clearTimeout(timeoutId);
        }
        // TODO: error type
        timeoutId = setTimeout(() => reject(new Error('timeout')), options.timeout ?? 5000);
      };
      // sets timeout timer
      setTimeoutTimer();

      // forces the pending promise to reject, so resources clean up if the request is aborted
      request.signal.addEventListener('abort', () => {
        reject(new DOMException('Aborted', 'AbortError'));
      });

      // This channel is meant for the Receiver to send the results (aka `HandlerMessage<M>` messages)
      // ignore all Requestor events received (aka `RequestorMessage`)
      responseChannel.onmessage = (event) => {
        if ('action' in event.data) {
          return;   // ignore message
        }

        // event type is now `HandlerMessage<M>`
        const { status } = event.data;
        switch (status) {
          case 'SUCCESS':
            return resolve(event.data.data);

          case 'FAILED':
            return resolve(event.data.data);

          case 'PENDING':
            // defer the timeout timer when a heartbeat is received (host is still working)
            setTimeoutTimer();

            break;
        }
      };

      requestChannel.postMessage({ ...request.send(), __v: MessageBus.BusVersion });
      requestChannel.close();
    }))
    .finally(() => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      requestChannel.close();
      responseChannel.close();
      this.#pending.delete(request.id);
    });

    // TODO: review
    const cancel = () => {
      responseChannel.postMessage({ action: 'CANCEL', __v: MessageBus.BusVersion });
    };

    return { result, cancel };
  }

  subscribe<K extends keyof M & keyof R>(handler: MessageBus.MessageHandler) {
    this.#channel = this.createListenerChannel();
    this.#channel.onmessage = async (evt, reply) => {
      const { messageId, data, __v } = evt.data;

      if (!messageId || !data) {
        return;
      }

      const responseChannel: MessageBus.HandlerChannel<R[K]> = this.createHandlerChannel(messageId);
      const message = new MessageBus.BusRequest<M[K], R[K]>({
        __v: __v ?? '1',    // "version 1" does not set this value, therefore it will be undefined
        id: messageId,
        data,
        channel: responseChannel,
        reply
      });

      this.pushMessage(message);

      responseChannel.onmessage = (event) => {
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
            message.abort('cancel');
            break;
        }
      };

      try {
        message.reply('PENDING');
        await handler(message, { signal: message.signal });
      }
      catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return null;
        }

        // TODO: what do I do with caught errors?
      }
      finally {
        this.clearMessage(messageId);
        responseChannel.close();
      }
    };
  }

  close () {
    this.#channel?.close();
    for (const message of this.#pending.values()) {
      message.abort();
      message.channel.close();
    }
  }
}

export namespace MessageBus {
  // NOTE: update this value when the payload structure of the MessageBus changes
  export const BusVersion = 2;

  /**
   * Possible `status` values indicating the process of an orchestrated request
   */
  export type BusRequestStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

  export type BusVersions = 1 | 2;

  /**
   * The payload of a message sent from Subscriber to Requestor, indicating the process or result of a request
   */
  export type HandlerMessage<M extends TypeMap> = {
    status: 'SUCCESS';
    data: M;
    __v: BusVersions;
  } | {
    status: 'FAILED'
    data: M;
    __v: BusVersions;
  } | {
    status: 'PENDING'
    __v: BusVersions;
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
  export type ListenerChannel<M extends TypeMap> = BroadcastChannelLike<{ data: M, messageId: string; __v: BusVersions }>;

  /**
   * A channel created to communicate the results of a pending request (will be isolated to specific Subscriber and Requestor)
   */
  export type HandlerChannel<M extends TypeMap> = BroadcastChannelLike<
    (RequestorMessage | HandlerMessage<M>) & { __v: BusVersions }
  >;

  /**
   * @internal
   * 
   * @typeParam Q - re(Q)uest event payload
   * @typeParam S - re(S)ponse event payload
   */
  export type BusRequestInit<Q extends TypeMap, S extends TypeMap> = {
    __v: BusVersions;
    id: string;
    data: Q;
    channel: HandlerChannel<S>;
    reply?: (response: any) => void;
  };

  /**
   * @internal
   * 
   * @typeParam Q - re(Q)uest event payload
   * @typeParam S - re(S)ponse event payload
   */
  export class BusRequest<Q extends TypeMap, S extends TypeMap> {
    public __v: BusRequestInit<Q, S>['__v'];
    public id: BusRequestInit<Q, S>['id'];
    public data: BusRequestInit<Q, S>['data'];
    public channel: BusRequestInit<Q, S>['channel'];
    private replyFn: BusRequestInit<Q, S>['reply'];
    public controller: AbortController = new AbortController();

    constructor ({ id, data, channel, __v, reply }: BusRequestInit<Q, S>) {
      this.id = id;
      this.data = data;
      this.channel = channel;
      this.__v = __v;
      this.replyFn = reply;
    }

    send () {
      return { messageId: this.id, data: this.data };
    }

    reply (data: S, status: MessageBus.BusRequestStatus): void;
    reply (status: 'PENDING'): void;
    reply (data: S | 'PENDING', status: MessageBus.BusRequestStatus = 'SUCCESS') {
      const fn = this.replyFn ?? this.channel.postMessage;

      if (data === 'PENDING' || status === 'PENDING') {
        // only send `PENDING` heartbeats when using <= v2 of the MessageBus payload structure
        if (this.__v === 2) {
          fn({ status: 'PENDING', __v: this.__v } satisfies HandlerMessage<S>);
        }
      }
      else {
        // TODO: remove this condition
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
      return this.controller.abort(...args);
    }

    get signal (): AbortSignal {
      return this.controller.signal;
    }
  }

  /**
   * @internal
   */
  export type BusMessageOptions = {
    timeout?: number | null;
  };

  /**
   * @internal
   */
  export type BusResponse<R extends TypeMap> = {
    result: Promise<R>;
    cancel: () => void;
  };

  /**
   * @internal
   */
  export type MessageHandler = (message: BusRequest<any, any>, options?: { signal: AbortSignal }) => any;

}
