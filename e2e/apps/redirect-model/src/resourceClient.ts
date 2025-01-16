import { Credential } from '@okta/spa-platform';
import { FetchClient } from '@okta/spa-platform/fetch';
import { HostOrchestrator } from '@okta/spa-platform/orchestrator';
import { oauthConfig } from '@/auth';


const nested = new HostOrchestrator.SubApp('SubAppOrchestrator', oauthConfig);

export const fetchClient = new FetchClient(nested);


// Host App (Token Broker) Orchestrator
const channel = new BroadcastChannel('SubAppOrchestrator');
channel.onmessage = (event) => {
  const { eventName, requestId, envId, data } = event.data;

  console.log('hello', envId, data);
  const responseChannel = new BroadcastChannel(requestId);

  const credential = Credential.default;

  let response;
  if (!credential) {
    response = { error: 'No token found' };
  }
  else {
    response = { token: credential.token.toJSON() };
  }

  responseChannel.postMessage(response);
  responseChannel.close();
};
