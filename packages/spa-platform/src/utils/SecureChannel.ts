import { validateURL } from '@okta/auth-foundation/internal';

type SecureChannelMessage = Record<string, any>;
type SecureChannelMessageHandler = (event: any) => void;

/** @internal */
const UNIQUE_MESSAGE_KEY = '__SecureChannel__';

const origin = new URL(location.href).origin;

export type SecureChannelOptions = {
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
export class SecureChannel {
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
   * Reference to the message handler function, keeps track of the function
   * so it can be unbound
   */
  #onmessage: SecureChannelMessageHandler | null = null;
  
  constructor (name: string, targetOrigin?: string);
  constructor (name: string, options: SecureChannelOptions);
  constructor (public readonly name: string, init: string | SecureChannelOptions = {}) {
    const options: SecureChannelOptions = {};
    if (typeof init === 'string') {
      options.targetOrigin = init;
    }
    else {
      Object.assign(options, init);
    }

    if (options.targetOrigin && !validateURL(options.targetOrigin)) {
      throw new TypeError('`targetOrigin` is not a valid URL');
    }
    this.#targetOrigin = options.targetOrigin;
    if (options.allowedOrigins) {
      this.#allowedOrigins = options.allowedOrigins;
    }
  }

  close () {
    if (this.#onmessage) {
      window.removeEventListener('message', this.#onmessage);
    }
  }

  private isTrustedMessage (event): boolean {
    if (event.isTrusted && event.source &&
      this.#allowedOrigins.includes(new URL(event.origin).origin)
    ) {
      return true;
    }

    return false;
  }

  private isValidMessage (message: SecureChannelMessage): boolean {
    if (
      message && typeof message === 'object' &&
      message.source === UNIQUE_MESSAGE_KEY &&
      message.name === this.name
    ) {
      return true;
    }

    return false;
  }

  get onmessage (): SecureChannelMessageHandler | null {
    return this.#onmessage;
  }

  set onmessage (handler: (event: SecureChannelMessage, reply?: SecureChannelMessageHandler) => void) {
    if (this.#onmessage) {
      window.removeEventListener('message', this.#onmessage);
    }

    const wrappedHandler = (event: MessageEvent) => {
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

      handler({ data: event.data.message }, reply);
    };
    window.addEventListener('message', wrappedHandler);
    this.#onmessage = wrappedHandler;
  }

  postMessage (message: SecureChannelMessage) {
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
