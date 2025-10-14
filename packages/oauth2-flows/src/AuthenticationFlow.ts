/**
 * @module Core
 */

import { EventEmitter, Emitter, AuthSdkError } from '@okta/auth-foundation';


/**
 * @group Errors
 */
export class AuthenticationFlowError extends AuthSdkError {}

/**
 * @group EventEmitter
 */
export type AuthenticationFlowEvents = {
  'flow_started': void,
  'flow_stopped': void,
  'flow_errored': { error: unknown },
};

/**
 * Abstract class representing an authentication flow
 */
export abstract class AuthenticationFlow implements Emitter<AuthenticationFlowEvents> {
  protected readonly emitter: EventEmitter<AuthenticationFlowEvents> = new EventEmitter();
  protected pending: boolean = false;
  #inProgress: boolean = false;

  on (...args: Parameters<EventEmitter<AuthenticationFlowEvents>['on']>): void {
    this.emitter.on(...args);
  }

  off (...args: Parameters<EventEmitter<AuthenticationFlowEvents>['off']>): void {
    this.emitter.off(...args);
  }
  
  public get inProgress (): boolean {
    return this.#inProgress;
  }

  protected set inProgress (inProgess: boolean) {
    this.#inProgress = inProgess;
    if (inProgess) {
      this.emitter.emit('flow_started');
    }
    else {
      this.emitter.emit('flow_stopped');
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
