import type { HostOrchestrator as HO } from './index.ts';
import {
  shortID,
  TokenInit,
  EventEmitter,
  Emitter,
  TokenOrchestrator
} from '@okta/auth-foundation';
import { Token } from '../../platform/index.ts';
import { SecureChannel } from '../../utils/SecureChannel.ts';


function isErrorResponse (input: unknown): input is HO.ErrorResponse {
  if (input === null) {
    return false;
  }

  if (typeof input === 'object' && (input as HO.ErrorResponse).error &&
      typeof (input as HO.ErrorResponse).error === 'string')
  {
    return true;
  }
  return false;
}

export abstract class HostOrchestrator implements Emitter<HO.HostEvents> {
  protected readonly emitter: EventEmitter<HO.HostEvents> = new EventEmitter();
  id: string = shortID();
  #channel: SecureChannel | null = null;
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

  on (...args: Parameters<EventEmitter<HO.HostEvents>['on']>) {
    return this.emitter.on(...args);
  }

  off (...args: Parameters<EventEmitter<HO.HostEvents>['off']>) {
    return this.emitter.off(...args);
  }

  get isActive () {
    return this.#channel !== null;
  }

  protected shouldActive (): boolean {
    return window.self === window.top;
  }

  activate () {
    this.#channel = new SecureChannel(this.name, {
      targetOrigin: new URL(location.href).origin,
      allowedOrigins: this.#allowedOrigins
    });
    this.#channel.onmessage = async (event, reply) => {
      await this.parseRequest(event.data, reply);
    };
    this.#channel.postMessage({
      eventName: 'ACTIVATED',
      hostId: this.id
    });
  }

  close () {
    this.#channel?.close();
    this.#channel = null;
  }

  protected async parseRequest (request: HO.RequestEvent, replyFn) {
    this.emitter.emit('request_received', { request });
    const { eventName, data } = request;

    let response: HO.Response;
    switch (eventName) {
      case 'ACTIVATED':
        return this.handleHostActivated(request);
      case 'PING':
        response = { message: 'PONG' } satisfies HO.PingResponse;
        break;
      case 'TOKEN':
        response = await this.handleTokenRequest(data);
        break;
      case 'AUTHORIZE':
        response = await this.handleAuthorizeRequest(data);
        break;
      case 'PROFILE':
        response = await this.handleProfileRequest(data);
        break;
      default:
        response = { error: 'Unknown eventName provided' } satisfies HO.ErrorResponse;
    }

    this.emitter.emit('request_fulfilled', { request, response: { ...response }});
    return replyFn(response);
  }

  protected handleHostActivated ({ hostId }: any) {
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
      return { token: result.toJSON() as TokenInit };
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
