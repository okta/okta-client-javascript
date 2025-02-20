import { EventEmitter, Emitter, AuthSdkError } from '@okta/auth-foundation';


export class AuthenticationFlowError extends AuthSdkError {}

class AuthenticationFlowEmitter extends EventEmitter {
  flowStarted (data: Record<string, any> = {}) {
    this.emit('flow_started', data);
  }

  flowErrored (data: Record<string, any> = {}) {
    this.emit('flow_errored', data);
  }

  flowStopped (data: Record<string, any> = {}) {
    this.emit('flow_stopped', data);
  }
}

export abstract class AuthenticationFlow implements Emitter {
  protected readonly emitter = new AuthenticationFlowEmitter();
  protected pending: boolean = false;
  #inProgress: boolean = false;

  on (...args: Parameters<EventEmitter['on']>): void {
    this.emitter.on(...args);
  }

  off (...args: Parameters<EventEmitter['off']>): void {
    this.emitter.off(...args);
  }
  
  public get inProgress (): boolean {
    return this.#inProgress;
  }

  protected set inProgress (inProgess: boolean) {
    this.#inProgress = inProgess;
    if (inProgess) {
      this.emitter.flowStarted();
    }
    else {
      this.emitter.flowStopped();
    }
  }

  public reset () {
    this.inProgress = false;
  }

  protected startFlow () {
    if (this.inProgress) {
      throw new AuthenticationFlowError('flow already in progress');
    }

    this.inProgress = true;
  }
}

export namespace AuthenticationFlow {
  export interface Options {
    issuer: string | URL;
    clientId: string;
    scopes: string | string[];
    dpop?: boolean;
  }
}
