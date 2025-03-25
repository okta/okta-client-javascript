import type { TokenOrchestrator } from '../../TokenOrchestrator';
import type { HostOrchestrator as HO } from '.';
import { shortID, Token, TokenInit, EventEmitter } from '@okta/auth-foundation';
import { SecureChannel } from '../../../utils/SecureChannel';


export class HostOrchestratorEventEmitter extends EventEmitter {
  duplicateHosts (id: string, duplicateId: string) {
    this.emit('duplicate_host', { id, duplicateId });
  }

  loginPromptRequired (details: Record<string, any>) {
    this.emit('login_prompt_required', details);
  }
}

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

export abstract class HostOrchestrator {
  protected readonly emitter = new HostOrchestratorEventEmitter();
  id: string = shortID();
  #channel: SecureChannel | null = null;
  #allowedOrigins: string[] = [ new URL(location.href).origin ];

  constructor (protected readonly name: string, options: HO.HostOptions = {}) {
    if (options.allowedOrigins) {
      this.#allowedOrigins = [...this.#allowedOrigins, ...options.allowedOrigins];
    }

    if (window.self === window.top) {
      // only auto-activate the Host if the Host is *not* loading in an iframe
      // The Host is designed to be place at the parent window
      this.activate();
    }
  }

  on (...args: Parameters<EventEmitter['on']>) {
    return this.emitter.on(...args);
  }

  off (...args: Parameters<EventEmitter['off']>) {
    return this.emitter.off(...args);
  }

  get isActive () {
    return this.#channel !== null;
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

  private async parseRequest (request: HO.RequestEvent, replyFn) {
    const { eventName, data } = request;

    let response;
    switch (eventName) {
      case 'ACTIVATED':
        return this.handleHostActivated(request);
      case 'PING':
        response = { message: 'PONG' };
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
        response = { error: 'Unknown eventName provided' };
    }

    return replyFn(response);
  }

  private handleHostActivated ({ hostId }: any) {
    if (hostId !== this.id) {
      console.warn('Multiple HostOrchestrators are active on this page!');
      this.emitter.duplicateHosts(this.id, hostId);
    }
  }

  private async handleTokenRequest (event: HO.TokenRequest): Promise<HO.TokenResponse> {
    const { issuer, clientId, scopes } = event;
    const result = await this.findToken({ issuer, clientId, scopes });

    if (isErrorResponse(result)) {
      return result;
    }
    else if (result instanceof Token) {
      return { token: result.toJSON() as TokenInit };
    }

    return { error: 'Unable to obtain token' };
  }

  private async handleAuthorizeRequest (event: HO.AuthorizeRequest): Promise<HO.AuthorizeResponse> {
    const { url, method, nonce, issuer, clientId, scopes } = event;

    if (!url || !method) {
      return { error: 'request url or method not provided' };
    }

    const result = await this.findToken({ issuer, clientId, scopes });

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

  private async handleProfileRequest (event: HO.TokenRequest) {
    const { issuer, clientId, scopes } = event;
    const result = await this.findToken({ issuer, clientId, scopes });

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

  abstract findToken (params: TokenOrchestrator.OAuth2Params): Promise<Token | null | HO.ErrorResponse>; 
}
