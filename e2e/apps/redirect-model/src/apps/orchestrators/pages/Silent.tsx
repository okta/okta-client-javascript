import { AuthorizationCodeFlow } from '@okta/spa-oauth2-flows';
import { AuthorizationCodeFlowOrchestrator } from '@okta/spa-platform';
import { FetchClient } from '@okta/spa-platform/fetch';
import { oauthConfig } from '@/auth';
import { createMessageComponent } from '../createMessageComponent';


const authCodeFlow = new AuthorizationCodeFlow({
  ...oauthConfig,
  redirectUri: `${window.location.origin}/login/callback`,
});

const orchestrator = new AuthorizationCodeFlowOrchestrator(authCodeFlow, {
  avoidPrompting: true
});

const fetchClient = new FetchClient(orchestrator);

const Messages = createMessageComponent(fetchClient);

export function SilentPrompt () {
  return (
    <>
      <h1>SilentPrompt</h1>
      <Messages />
    </>
  );
}
