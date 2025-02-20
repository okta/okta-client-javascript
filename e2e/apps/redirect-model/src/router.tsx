import { createBrowserRouter } from 'react-router-dom';
import { Credential } from '@okta/spa-platform';
import { AuthorizationCodeFlow } from '@okta/spa-oauth2-flows';
import { signInFlow, orchestrator } from '@/auth';

// import Page components
import { App } from './App';
import { Landing } from '@/component/Landing';
import { SecureRoute } from '@/component/SecureRoute';
import { LoginCallback } from '@/component/LoginCallback';
import { LogoutCallback } from '@/component/LogoutCallback';
import { Protected } from '@/component/Protected';
import { Frame } from '@/component/Frame';
import { Messages } from '@/component/Messages';
import { Frame2 } from '@/component/Frame2';

import orchestratorRoutes from '@/apps/orchestrators/routes';


export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        path: '',
        element: <Landing />
      },
      {
        path: '/login/callback',
        element: <LoginCallback />
      },
      {
        path: '/logout',
        element: <LogoutCallback />
      },
      {
        path: '/iframe',
        element: <Frame />
      },
      {
        path: '/messages',
        element: <Messages />
      },
      {
        path: '/iframe2',
        element: <Frame2 />
      },
      {
        path: '/secured/*',
        children: [
          {
            path: '',
            element: <SecureRoute />,
            children: [{
              path: '',
              element: <Protected />,
            }]
          },
          {
            path: 'tag',
            element: <SecureRoute withTag='main' />,
            children: [{
              path: '',
              element: <Protected />,
            }]
          },
          {
            path: 'custom',
            element: <SecureRoute findCredential={() => Credential.with(Credential.allIDs[0])!} />,
            children: [{
              path: '',
              element: <Protected />,
            }]
          },
          {
            path: 'fail',
            element: <SecureRoute withTag='foobar' />,
            children: [{
              path: '',
              element: <Protected />,
            }]
          },
        ]
      },
      {
        path: '/orchestrator',
        children: orchestratorRoutes
      }
    ]
  }
]);

orchestrator.on('PROMPT_REQUIRED', async (options) => {
  console.log('PROMPT REQUIRED');
  if (window.confirm('Login is required')) {
    await signInFlow.start({ originalUri: new URL(window.location.href).pathname });
    await AuthorizationCodeFlow.PerformRedirect(signInFlow);
  }
  else {
    router.navigate('/')
  }
});
