---
slug: /api-design
id: "api-design"
title: "API Design"
sidebar_label: "API Design"
custom_edit_url: null
toc_max_heading_level: 4
---

To seamlessly integrate OAuth2 into your web app, we'll first work backwards from the most common use case for an `Access Token` in a Web App: requesting a resource from an protected REST API.

### Sending authorized API requests
The `FetchClient` class is a simple wrapper around [`fetch`](https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch), which will sign any outgoing requests with the appropriate HTTP headers for the current user. This includes sending an `Authorization` header using the user's `Access Token` as a Bearer token, but can automatically include other headers as needed.

#### Initialization
```javascript
// #### webapp/resourceClient.ts ####
export const fetchClient = new FetchClient(orchestrator, {
  issuer: 'https://example.okta.com',
  clientId: '00a123454678',
  scope: 'openid profile offline_access'
});
```

#### Fetching a resource
```javascript
// #### webapp/components/Messages.tsx ####
import { fetchClient } from '@/resourceClient';

async function fetchData () {
  const response = await fetchClient.fetch('/api/messages');
  return response.json();
};

export function Messages () { ... }   // `fetchData` would be used within Component function
```

#### Writing a resource
```javascript
// #### webapp/components/Messages.tsx ####
async function postMessage (msg) {
  const response = await fetchClient.fetch('/api/messages', {
    body: JSON.stringify({ message: msg }),
    method: 'POST',
    // writing a message requires an additional scope not required for GET requests
    scopes: [...oauthConfig.scopes, 'api.messages.manage']
  });
  return response.json();
};
```

TODO: doc events

### How credentials are obtained
Under the covers, the `CredentialOrchestrator` abstract class defines how tokens will be obtained to fulfill requests. Consumers of a `CredentialOrchestrator`, like the [`FetchClient`](#sending-authorized-api-requests) should assume any retrieved token is valid, as it's the responsibility of the orchestrator to ensure it is.

The `@okta/spa-platform` library (via `@okta/spa-platform/orchestrator`) provides a few out-of-the-box implementations, which should be sufficient for most use cases.

TODO: doc events

#### Web redirect / OIDC authentication
The `AuthorizationCodeFlowOrchestrator` orchestrator uses the OAuth2 "[Authorization Code Flow](https://developer.okta.com/docs/concepts/oauth-openid/#authorization-code-flow-with-pkce-flow)" to perform a web redirection to sign users in. It first checks to see if a user has already signed in by checking storage for any existing tokens which match the required criteria (`clientId`, `scopes`, etc). If a token is found _and_ it is valid (not expired) those tokens are returned. If the token is expired, the orchestrator attempts to refresh the token. If no token is found _or_ can't be refreshed, a new token will be requested from the `Authorization Server` which will result in the usesr being prompted to sign in again.

> __Note:__ Before redirecting to the `Authorization Server`, an event will be fired `'PROMPT_REQUIRED'`

```javascript
// #### webapp/auth.ts ####
import { AuthorizationCodeFlow } from '@okta/spa-oauth2-flows';

export const signInFlow = new AuthorizationCodeFlow({
  ...oauthConfig,
  redirectUri: `${window.location.origin}/login/callback`,
});

// this orchestrator will fire an event before redirecting to the Authorization Server
// when the enduser needs to be prompted in order to fetch a token
export const orchestrator = new AuthorizationCodeFlowOrchestrator(signInFlow);

// #### webapp/router.tsx ####
import { signInFlow, orchestrator } from '@/auth';

// react-router-dom
export const router = createBrowserRouter(...);

// handles the 'PROMPT_REQUIRED' event
orchestrator.on('PROMPT_REQUIRED', async (options) => {
  if (window.confirm('Login is required')) {
    await signInFlow.start({ originalUri: new URL(window.location.href).pathname });
    await AuthorizationCodeFlow.PerformRedirect(signInFlow);
  }
  else {
    router.navigate('/');
  }
});

// #### webapp/resourceClient.ts ####
const { issuer, clientId, scopes } = oauthConfig;
export const fetchClient = new FetchClient(orchestrator, { issuer, clientId, scopes });
```

#### `SubAppOrchestrator`
This orchestrator will delegate all requests for tokens to a host/parent orchestrator. Any app using this orchestrator should consider all tokens ephemeral and should *always* delegate any token storage or lifecycle management to the parent

```javascript
// #### webapp/resourceClient.ts ####
const orchestrator = new SubAppOrchestrator();

const { issuer, clientId, scopes } = oauthConfig
export const fetchClient = new FetchClient(orchestrator, { issuer, clientId, scopes });
```
