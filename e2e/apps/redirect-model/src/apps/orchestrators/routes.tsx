import { Redirect, RedirectCallback } from './pages/Redirect';
import { SilentPrompt } from './pages/Silent';
import { ProxyHost } from './pages/ProxyHost';

export default [
  {
    path: 'redirect/callback',
    element: <RedirectCallback />,
    // children: []
  },
  {
    path: 'redirect',
    element: <Redirect />,
    // children: []
  },
  {
    path: 'silent',
    element: <SilentPrompt />,
    // children: []
  },
  {
    path: 'proxyhost',
    element: <ProxyHost />,
    // children: []
  }
];
