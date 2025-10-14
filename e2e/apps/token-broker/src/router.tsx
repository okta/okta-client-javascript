import { createBrowserRouter } from 'react-router-dom';

// import Page components
import { App } from './App';
import { AppShell } from '@/component/AppShell';
import { LoginCallback } from '@/component/LoginCallback';
import { LogoutCallback } from '@/component/LogoutCallback';
import { Messages } from '@/component/Messages';
import { Embedded } from '@/component/Embedded';


export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        path: 'messages',
        element: <Messages />
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
        path: '/',
        element: <AppShell />,
        children: [
          {
            path: '',
            element: <Messages />
          },
          {
            path: '/embedded',
            element: <Embedded />,
          },
        ],
      }
    ]
  }
]);
