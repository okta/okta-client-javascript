import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { AuthorizationCodeFlow } from '@okta/spa-oauth2-flows';
import { AuthorizationCodeFlowOrchestrator } from '@okta/spa-platform';
import { FetchClient } from '@okta/spa-platform/fetch';
import { oauthConfig } from '@/auth';
import { Loading } from '@/component/Loading';
import { createMessageComponent } from '../createMessageComponent';


const authCodeFlow = new AuthorizationCodeFlow({
  ...oauthConfig,
  redirectUri: `${window.location.origin}/login/callback`,
});

const orchestrator = new AuthorizationCodeFlowOrchestrator(authCodeFlow, {
  emitBeforeRedirect: false
});

const fetchClient = new FetchClient(orchestrator);

const Messages = createMessageComponent(fetchClient);


export function Redirect () {
  return (
    <>
      <h1>Redirect</h1>
      <Messages />
    </>
  );
}

let flowResumed = false;

export function RedirectCallback () {
  const navigate = useNavigate();
  const [callbackError, setCallbackError] = useState<Error | null>(null);

  useEffect(() => {
    // prevents mutiple calls in strict mode
    if (!flowResumed) {
      orchestrator.resumeFlow()
      .then(({ originalUri }) => {
        navigate(originalUri ?? '/', { replace: true });
      })
      .catch(err => {
        console.log(err, err.message);
        setCallbackError(err as unknown as Error);
      });

      flowResumed = true;
    }
  }, [orchestrator]);

  if (callbackError) {
    return (<h3>There was an error</h3>);
  }

  return (<Loading />); 
}
