import { Credential } from '@okta/spa-platform';
import { FetchClient } from '@okta/spa-platform/fetch';
import { SubAppOrchestrator } from '@okta/spa-platform/orchestrator';
import { oauthConfig } from '@/auth';

export { SAOError } from '@okta/spa-platform/orchestrator';


const nested = new SubAppOrchestrator();

const { issuer, clientId, scopes } = oauthConfig
export const fetchClient = new FetchClient(nested, { issuer, clientId, scopes });


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
