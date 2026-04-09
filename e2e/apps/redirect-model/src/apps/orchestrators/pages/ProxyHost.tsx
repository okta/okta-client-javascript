import {
  HostOrchestrator,
  FetchClient
} from '@okta/spa-platform';
import {
  AuthorizationCodeFlow,
  AuthorizationCodeFlowOrchestrator
} from '@okta/spa-platform/flows';
import { client } from '@/auth';
import { createMessageComponent } from '../createMessageComponent';


const authCodeFlow = new AuthorizationCodeFlow(client, {
  redirectUri: `${window.location.origin}/login/callback`,
});

const orchestrator = new AuthorizationCodeFlowOrchestrator(authCodeFlow, {
  emitBeforeRedirect: false
});

const host = new HostOrchestrator.ProxyHost('ProxyHost Test', orchestrator);

const subapp = new HostOrchestrator.SubApp('ProxyHost Test');

const fetchClient = new FetchClient(subapp);

const Messages = createMessageComponent(fetchClient);


export function ProxyHost () {
  return (
    <>
      <h1>ProxyHost</h1>
      <Messages />
    </>
  );
}

// NOTE: relies on /redirect/callback (from ./Redirect.tsx)
