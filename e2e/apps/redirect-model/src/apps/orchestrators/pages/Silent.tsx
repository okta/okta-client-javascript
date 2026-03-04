import {
  AuthorizationCodeFlow,
  AuthorizationCodeFlowOrchestrator,
  FetchClient
} from '@okta/spa-platform';
import { client } from '@/auth';
import { createMessageComponent } from '../createMessageComponent';


const authCodeFlow = new AuthorizationCodeFlow(client, {
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
