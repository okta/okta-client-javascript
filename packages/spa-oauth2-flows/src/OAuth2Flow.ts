import { EventEmitter, Emitter, AuthSdkError } from '@okta/auth-foundation';

export class OAuth2FlowError extends AuthSdkError {}

class OAuth2FlowEmitter extends EventEmitter {
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

export class OAuth2Flow implements Emitter {
  protected readonly emitter = new OAuth2FlowEmitter();
  protected pending: boolean = false;

  on (...args: Parameters<EventEmitter['on']>): void {
    this.emitter.on(...args);
  }

  off (...args: Parameters<EventEmitter['off']>): void {
    this.emitter.off(...args);
  }
  
  public get inProgress (): boolean {
    return this.pending;
  }

  protected set inProgress (inProgress: boolean) {
    this.pending = inProgress;
    if (inProgress) {
     this.emitter.flowStarted();
    }
    else {
      this.emitter.flowStopped();
    }
  }

  reset () {
    this.inProgress = false;
  }
}
