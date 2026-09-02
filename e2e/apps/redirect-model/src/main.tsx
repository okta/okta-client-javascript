import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { Credential }  from '@okta/spa-platform';
import { router } from './router';
import { Loading } from './component/Loading';
import './index.css';


// TODO: [OKTA-977044] remove
const USE_DPOP = __USE_DPOP__ === "true";
if (USE_DPOP) {
  // @ts-expect-error - used to test backwards compat support
  Credential.coordinator.tokenStorage.supportLegacyStructure = true;
}

const rootElement = document.querySelector('[data-js="root"]');

if (!rootElement) {
  throw new Error('Failed to find the root element');
}

// @ts-expect-error - This is added for e2e purposes only, not recommended for production apps
window.Credential = Credential;

const root = createRoot(rootElement);
root.render(
  <StrictMode>
    <RouterProvider router={router} fallbackElement={<Loading />} />
  </StrictMode>
);
