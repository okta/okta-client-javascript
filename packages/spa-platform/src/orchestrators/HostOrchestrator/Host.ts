import type { HostOrchestrator as HO } from './index.ts';
import {
  shortID,
  type TokenPrimitiveInit,
  EventEmitter,
  type Emitter,
  TokenOrchestrator
} from '@okta/auth-foundation';
import { Token } from '../../platform/index.ts';
import { OrchestrationBridge } from './OrchestrationBridge.ts';


function isErrorResponse (input: unknown): input is HO.ErrorResponse {
  if (input && typeof input === 'object' && 'error' in input) {
    return typeof input.error === 'string';
  }
  return false;
}

export abstract class HostOrchestrator<E extends HO.HostEvents = HO.HostEvents> implements Emitter<E> {
  protected readonly emitter: EventEmitter<E> = new EventEmitter();
  id: string = shortID();
  #bridge: OrchestrationBridge | null = null;
  #allowedOrigins: string[] = [ new URL(location.href).origin ];

  constructor (protected readonly name: string, options: HO.HostOptions = {}) {
    if (options.allowedOrigins) {
      this.#allowedOrigins = [...this.#allowedOrigins, ...options.allowedOrigins];
    }

    if (this.shouldActive()) {
      // only auto-activate the Host if the Host is *not* loading in an iframe
      // The Host is designed to be place at the parent window
      this.activate();
    }
  }

  on (...args: Parameters<EventEmitter<E>['on']>) {
    return this.emitter.on(...args);
  }

  off (...args: Parameters<EventEmitter<E>['off']>) {
    return this.emitter.off(...args);
  }

  get isActive () {
    return this.#bridge !== null;
  }

  protected shouldActive (): boolean {
    return window.self === window.top;
  }

  activate () {
    this.#bridge = new OrchestrationBridge(this.name, { allowedOrigins: this.#allowedOrigins });
    this.#bridge.subscribe(async (event, reply) => {
      // TODO:
      // return new Promise(resolve => {});   - for testing, will remove before merge
      try {
        // const reply = (msg) => message.reply(msg);
        await this.parseRequest(event, reply);
      }
      catch (err) {
        console.log('parseRequest error', err);
        // TODO: probably should throw here?
      }
    });
    this.#bridge.send({
      eventName: 'ACTIVATED',
      hostId: this.id,
      data: undefined
    }, { timeout: null });
  }

  close () {
    this.#bridge?.close();
    this.#bridge = null;
  }

  protected async parseRequest<K extends keyof HO.RequestEvent>(request: HO.RequestEvent[K], replyFn) {
    this.emitter.emit('request_received', { request });
    const { eventName } = request;

    let response: HO.ResponseEvent[keyof HO.ResponseEvent];
    switch (eventName) {
      case 'ACTIVATED':
        return this.handleHostActivated(request);
      case 'PING':
        response = { message: 'PONG' } satisfies HO.PingResponse;
        break;
      case 'TOKEN':
        response = await this.handleTokenRequest(request.data);
        break;
      case 'AUTHORIZE':
        response = await this.handleAuthorizeRequest(request.data);
        break;
      case 'PROFILE':
        response = await this.handleProfileRequest(request.data);
        break;
      default:
        response = { error: 'Unknown eventName provided' } satisfies HO.ErrorResponse;
    }

    this.emitter.emit('request_fulfilled', { request, response: { ...response }});
    return replyFn(response);
  }

  protected handleHostActivated ({ hostId }: HO.ActivatedEvent) {
    if (hostId !== this.id) {
      console.warn('Multiple HostOrchestrators are active on this page!');
      this.emitter.emit('duplicate_host', { id: this.id, duplicateId: hostId });
    }
  }

  protected async handleTokenRequest (event: HO.TokenRequest): Promise<HO.TokenResponse> {
    const { authParams } = TokenOrchestrator.extractAuthParams(event);
    const result = await this.findToken(authParams);

    if (isErrorResponse(result)) {
      return result;
    }
    else if (result instanceof Token) {
      return { token: result.toJSON() as TokenPrimitiveInit };
    }

    return { error: 'Unable to obtain token' };
  }

  protected async handleAuthorizeRequest (event: HO.AuthorizeRequest): Promise<HO.AuthorizeResponse> {
    const { url, method, nonce } = event;
    const { authParams } = TokenOrchestrator.extractAuthParams(event);

    if (!url || !method) {
      return { error: 'request url or method not provided' };
    }

    const result = await this.findToken(authParams);

    if (isErrorResponse(result)) {
      return result;
    }
    else if (result instanceof Token) {
      const token = result;
      const request = new Request(url, { method });
      await token.authorize(request, { dpopNonce: nonce });

      const dpop = request.headers.get('dpop');
      const authorization = request.headers.get('authorization');
  
      if (authorization) {
        const result: HO.AuthorizeResponse = {
          authorization,
          tokenType: token.tokenType 
        };

        if (token.tokenType === 'DPoP' && dpop) {
          result.dpop = dpop;
          return result;
        }

        if (token.tokenType === 'Bearer') {
          return result;
        }
      }
    }

    return { error: 'Unable to sign request' };
  }

  protected async handleProfileRequest (event: HO.TokenRequest): Promise<HO.ProfileResponse> {
    const { authParams } = TokenOrchestrator.extractAuthParams(event);
    const result = await this.findToken(authParams);

    if (isErrorResponse(result)) {
      return result;
    }
    else if (result instanceof Token) {
      if (result.idToken?.claims) {
        return { profile: result.idToken.claims };
      }
    }

    return { error: 'Unable to find idToken' };
  }

  abstract findToken (params: TokenOrchestrator.AuthorizeParams): Promise<Token | null | HO.ErrorResponse>; 
}
