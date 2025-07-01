import type { HostOrchestrator } from './index.ts';
import { MessageBus } from '@okta/auth-foundation';
import { SecureChannel } from '../../utils/SecureChannel.ts';

const defaultOptions = {
  targetOrigin: new URL(location.origin).origin,
  allowedOrigins: [ new URL(location.origin).origin ]
};

export class OrchestrationBus extends MessageBus<HostOrchestrator.RequestEvent, HostOrchestrator.ResponseEvent> {
  static targetOrigin: string = new URL(location.origin).origin;
  static allowedOrigins: string[] = [ OrchestrationBus.targetOrigin ];

  private readonly options: HostOrchestrator.HostOptions & HostOrchestrator.SubAppOptions;

  constructor (name:string, options: HostOrchestrator.HostOptions & HostOrchestrator.SubAppOptions = {}) {
    super(name);
    this.options = { ...defaultOptions, ...options };
  }

  protected createListenerChannel (
  ): MessageBus.ListenerChannel<HostOrchestrator.RequestEvent[keyof HostOrchestrator.RequestEvent]> {
    return new SecureChannel(this.name, this.options);
  }

  protected createHandlerChannel<K extends keyof HostOrchestrator.RequestEvent & keyof HostOrchestrator.ResponseEvent> (
    name: string
  ): MessageBus.HandlerChannel<HostOrchestrator.ResponseEvent[K]> {
    return new SecureChannel(name, this.options);
  }

}