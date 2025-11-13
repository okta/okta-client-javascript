/**
 * @packageDocumentation
 * @internal
 */

import type { JsonRecord, BroadcastChannelLike } from '@okta/auth-foundation';
import { validateURL } from '@okta/auth-foundation/internal';

export type LocalBroadcastChannelMessage<M = any> = {
  name: string;
  source: string;
  message: M;
};
export type LocalBroadcastChannelMessageHandler<M extends JsonRecord = JsonRecord, R extends JsonRecord = M> =
  (event: { data: M }, reply?: (message: R) => any) => any;

/**
 * @internal
 * Historical reasons for this string value, best not to change it
 */
const UNIQUE_MESSAGE_KEY = '__SecureChannel__';

const origin = new URL(location.href).origin;

export type LocalBroadcastChannelOptions = {
  targetOrigin?: string;
  allowedOrigins?: string[]
};


/**
 * @internal
 *
 * Based off of `BroadcastChannel`, but backed by `window.postMessage`
 * Designed for situations when broadcasts should be limited to current window
 * 
 * Supports cross-origin, but not cross-domain communication
 */
export class LocalBroadcastChannel<M extends JsonRecord = JsonRecord> implements BroadcastChannelLike<M> {
  /**
   * @internal
   * The origin to be broadcasted on
   */
  #targetOrigin: string | undefined;

  /**
   * @internal
   * The origins expected to receive messages from
   */
  #allowedOrigins: string[] = [new URL(location.href).origin];

  /**
   * @internal
   * The provided message handler (will be wrapped before mount to `window.addEventListener`)
   */
  #onmessage: LocalBroadcastChannelMessageHandler<M> | null = null;

  /**
   * @internal
   * Reference to the wrapper (aka bound) window message handler function
   * keeps track of the function so it can be unbound
   */
  #boundHandler: ((event: MessageEvent<LocalBroadcastChannelMessage<M>>) => void) | null = null;

  constructor (name: string, targetOrigin?: string);
  constructor (name: string, options: LocalBroadcastChannelOptions);
  constructor (public readonly name: string, init: string | LocalBroadcastChannelOptions = {}) {
    const options: LocalBroadcastChannelOptions = {};
    if (typeof init === 'string') {
      options.targetOrigin = init;
    }
    else {
      Object.assign(options, init);
    }

    if (options.targetOrigin && !validateURL(options.targetOrigin, true)) {
      throw new TypeError('`targetOrigin` is not a valid URL');
    }
    this.#targetOrigin = options.targetOrigin;
    if (options.allowedOrigins) {
      this.#allowedOrigins = options.allowedOrigins;
    }
  }

  close () {
    this.onmessage = null;
  }

  private isTrustedMessage (event: MessageEvent<LocalBroadcastChannelMessage<M>>): boolean {
    if (event.isTrusted && event.source &&
      this.#allowedOrigins.includes(new URL(event.origin).origin)
    ) {
      return true;
    }

    return false;
  }

  private isValidMessage (message: LocalBroadcastChannelMessage<M>): boolean {
    if (
      message && typeof message === 'object' &&
      message.source === UNIQUE_MESSAGE_KEY &&
      message.name === this.name
    ) {
      return true;
    }

    return false;
  }

  get boundHandler (): ((event: MessageEvent<LocalBroadcastChannelMessage<M>>) => any) | null {
    return this.#boundHandler;
  }

  set boundHandler (handler: ((event: MessageEvent<LocalBroadcastChannelMessage<M>>) => any) | null) {
    if (this.#boundHandler) {
      window.removeEventListener('message', this.#boundHandler);
    }

    if (handler === null) {
      this.#boundHandler = null;
    }
    else {
      this.#boundHandler = handler;
      window.addEventListener('message', this.#boundHandler);
    }
  }

  get onmessage (): LocalBroadcastChannelMessageHandler<M> | null {
    return this.#onmessage;
  }

  set onmessage (handler: LocalBroadcastChannelMessageHandler<M> | null) {
    if (handler === null) {
      this.#onmessage = null;
      this.boundHandler = null;
    }
    else {
      this.#onmessage = handler;

      const wrappedHandler = (event: MessageEvent<LocalBroadcastChannelMessage<M>>) => {
        if (!this.isTrustedMessage(event) || !this.isValidMessage(event.data)) {
          return;
        }
  
        event.preventDefault();
        event.stopPropagation();
  
        // pass a `reply` function to the handler to ease responding
        const reply = (response) => {
          // event.source exists, confirmed in `isTrustedMessage`
          event.source!.postMessage({
            name: event.data.message.requestId,
            source: UNIQUE_MESSAGE_KEY,
            message: response
          }, { targetOrigin: event.origin });
        };

        // wraps `message` in `{ data }` to mimic a `BroadcastChannel` event
        handler({ data: event.data.message }, reply);
      };
      this.boundHandler = wrappedHandler;
    }
  }

  postMessage (message: M) {
    if (!this.#targetOrigin) {
      return;
    }

    // always broadcast request to top-window object. The assumption being made here
    // is any 'HostOrchestrator' will be mounted on the top-level window
    return (window?.top ?? window).postMessage({
      name: this.name,
      source: UNIQUE_MESSAGE_KEY,
      message
    }, this.#targetOrigin ?? origin); // limits messages broadcasted to a specific domain
    // We should never send messages without a #tagetOrigin, however as an extra precaution
    // a reference to the page's own origin is provided. Worst case we message ourself
  }
}
