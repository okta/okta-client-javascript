import type { HostOrchestrator } from './index.ts';
import { TaskBridge } from '@okta/auth-foundation';
import { LocalBroadcastChannel } from '../../utils/LocalBroadcastChannel.ts';

const defaultOptions = {
  targetOrigin: new URL(location.origin).origin,
  allowedOrigins: [ new URL(location.origin).origin ]
};

export class OrchestrationBridge extends TaskBridge<HostOrchestrator.RequestEvent, HostOrchestrator.ResponseEvent> {
  static targetOrigin: string = new URL(location.origin).origin;
  static allowedOrigins: string[] = [ OrchestrationBridge.targetOrigin ];

  private readonly options: HostOrchestrator.HostOptions & HostOrchestrator.SubAppOptions;

  constructor (name:string, options: HostOrchestrator.HostOptions & HostOrchestrator.SubAppOptions = {}) {
    super(name);
    this.options = { ...defaultOptions, ...options };
  }

  protected createBridgeChannel (
  ): TaskBridge.BridgeChannel<HostOrchestrator.RequestEvent[keyof HostOrchestrator.RequestEvent]> {
    return new LocalBroadcastChannel(this.name, this.options);
  }

  protected createTaskChannel<K extends keyof HostOrchestrator.RequestEvent & keyof HostOrchestrator.ResponseEvent> (
    name: string
  ): TaskBridge.TaskChannel<HostOrchestrator.ResponseEvent[K]> {
    return new LocalBroadcastChannel(name, this.options);
  }

}