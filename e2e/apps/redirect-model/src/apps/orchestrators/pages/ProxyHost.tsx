import { AuthorizationCodeFlow } from '@okta/spa-oauth2-flows';
import { AuthorizationCodeFlowOrchestrator, HostOrchestrator } from '@okta/spa-platform';
import { FetchClient } from '@okta/spa-platform/fetch';
import { oauthConfig } from '@/auth';
import { createMessageComponent } from '../createMessageComponent';


const authCodeFlow = new AuthorizationCodeFlow({
  ...oauthConfig,
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
