import { createBrowserRouter } from 'react-router-dom';
import { Credential } from '@okta/spa-platform';
import { AuthorizationCodeFlow } from '@okta/spa-platform/flows';
import { signInFlow } from '@/auth';

// import Page components
import { App } from './App';
import { Landing } from '@/component/Landing';
import { SecureRoute } from '@/component/SecureRoute';
import { LoginCallback } from '@/component/LoginCallback';
import { LogoutCallback } from '@/component/LogoutCallback';
import { Protected } from '@/component/Protected';
import { Frame } from '@/component/Frame';

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
            element: <SecureRoute findCredential={async () => Credential.with((await Credential.allIDs())[0])} />,
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
