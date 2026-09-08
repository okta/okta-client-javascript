/**
 * @module Core
 */

import { EventEmitter, Emitter, AuthSdkError } from '@okta/auth-foundation/core';


/**
 * Thrown when an {@link AuthenticationFlow} is used incorrectly, such as starting a flow that
 * is already {@link AuthenticationFlow.inProgress | in progress}
 * @group Errors
 */
export class AuthenticationFlowError extends AuthSdkError {}

/**
 * Events emitted by every {@link AuthenticationFlow}
 * @group EventEmitter
 */
export type AuthenticationFlowEvents = {
  /** Emitted when {@link Core.AuthenticationFlow.inProgress | AuthenticationFlow.inProgress} transitions to `true` */
  'flow_started': void,
  /** Emitted when {@link Core.AuthenticationFlow.inProgress | AuthenticationFlow.inProgress} transitions to `false` */
  'flow_stopped': void,
  /** 
   * Emitted when a flow method throws; 
   * the underlying error is included as `error`
   * @inline
   */
  'flow_errored': { error: unknown },
};

/**
 * Base class shared by all OAuth2/OIDC flows in this package (e.g. {@link AuthorizationCodeFlow}), 
 * providing the common bits every flow needs: progress tracking and a shared {@link AuthenticationFlowEvents | event} surface.
 *
 * @remarks
 * This class is not meant to be used directly by Application Developers; reach for a concrete
 * flow implementation instead.
 *
 * @typeParam E - Map of all events fired from this flow. Extend {@link AuthenticationFlowEvents}
 * 
 * @example
 * Similar to {@link AuthFoundation!Networking.APIClient | APIClient}, to add flow-specific events
 * ```ts
 * type MyFlowEvents = { 'foo': { bar: number } } & AuthenticationFlowEvents;
 * 
 * class MyFlow<E extends MyFlowEvents = MyFlowEvents> extends AuthenticationFlow<E> {
 *   public async start (): Promise<Result> {
 *     this.startFlow();
 *     const result = await doSomething();
 * 
 *     // this will be properly type checked
 *     this.emitter('foo', { bar: 1 });
 *     
 *     return result;
 *   }
 * }
 * ```
 */
export abstract class AuthenticationFlow<E extends AuthenticationFlowEvents = AuthenticationFlowEvents> implements Emitter<E> {
  /**
   * Possible events: {@link AuthenticationFlowEvents}
   */
  protected readonly emitter: EventEmitter<E> = new EventEmitter();
  #inProgress: boolean = false;

  /**
   * Alias for `emitter.on`.
   * @see {@link AuthFoundation!Core.EventEmitter.on | EventEmitter.on}
   */
  on (...args: Parameters<EventEmitter<E>['on']>): void {
    this.emitter.on(...args);
  }

  /**
   * Alias for `emitter.off`.
   * @see {@link AuthFoundation!Core.EventEmitter.off | EventEmitter.off}
   */
  off (...args: Parameters<EventEmitter<E>['off']>): void {
    this.emitter.off(...args);
  }

  /**
   * Whether this flow is currently in progress. Setting this value emits
   * {@link AuthenticationFlowEvents.flow_started | flow_started} or
   * {@link AuthenticationFlowEvents.flow_stopped | flow_stopped}
   */
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

  /**
   * Resets the flow, marking it as no longer {@link Core.AuthenticationFlow.inProgress | AuthenticationFlow.inProgress}.
   * Subclasses should override this to additionally clear any in-progress flow state,
   * calling `super.reset()` to also reset {@link Core.AuthenticationFlow.inProgress | AuthenticationFlow.inProgress}
   */
  public reset () {
    this.inProgress = false;
  }

  /**
   * @internal
   * Marks the flow as {@link Core.AuthenticationFlow.inProgress | AuthenticationFlow.inProgress}, guarding against starting a flow
   * that's already running
   * @throws {@link AuthenticationFlowError} if the flow is already {@link Core.AuthenticationFlow.inProgress | AuthenticationFlow.inProgress}
   */
  protected startFlow () {
    if (this.inProgress) {
      throw new AuthenticationFlowError('flow already in progress');
    }

    this.inProgress = true;
  }
}

export namespace AuthenticationFlow {
  /**
   * Options common to every {@link AuthenticationFlow} implementation
   * 
   * @see {@link AuthFoundation!OAuth2.OAuth2Client.Configuration.ConfigurationParams | OAuth2Client.ConfigurationParams}
   */
  export interface Options {
    /** The Authorization Server's base URL */
    issuer: string | URL;
    /** The `client_id` registered with the {@link Options.issuer | issuer} */
    clientId: string;
    /** Scopes to request, either space-delimited or as an array of individual scope strings */
    scopes: string | string[];
    /** Whether the flow's underlying {@link AuthFoundation!OAuth2.OAuth2Client | OAuth2Client} should request DPoP-bound tokens */
    dpop?: boolean;
  }
}
