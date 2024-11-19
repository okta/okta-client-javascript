---
slug: /migrations/okta-react
id: "oktareact"
title: "Migration from @okta/okta-react"
sidebar_label: "@okta/okta-react"
custom_edit_url: null
toc_max_heading_level: 4
---

## Cheat Sheet
| `okta-react` | Equivalent | Library | Explanation / Example
| :------ | :------ | :------ | :------ |
[`<Security />`](https://github.com/okta/okta-react?tab=readme-ov-file#security) | **N/A** | **N/A** | [Explanation](#security-)
[`authState` / `isAuthenticated`](https://github.com/okta/okta-auth-js?tab=readme-ov-file#tokengetwithoutpromptoptions) | **N/A** | **N/A** | [Explanation](#authstate--isauthenticated)
[`<SecureRoute />`](https://github.com/okta/okta-react?tab=readme-ov-file#secureroute) | **N/A** | **N/A** | [Explanation](#secureroute-)
[`<LoginCallback />`](https://github.com/okta/okta-react?tab=readme-ov-file#logincallback) | `AuthorizationCodeFlow.resume()` | `spa-oauth2-flows` | [Example](#logincallback-)

### `<Security />`

The `<Security />` component of `@okta/okta-react` is a [React Context](https://react.dev/learn/passing-data-deeply-with-context#) used to tie in an instance of [`OktaAuth`](https://github.com/okta/okta-auth-js?tab=readme-ov-file#getting-started) from `@okta/okta-auth-js` into the React component tree. This pattern is no longer required and therefore there is no recommended replacement

### `authState` / `.isAuthenticated`

> **`tl;dr`:** Token validity is a function of time and therefore associating the token's validity and React App's state is not a good practice. No `authState` equivalent is available

`@okta/okta-react` recommends using the following pattern (seen [here](https://github.com/okta/okta-react?tab=readme-ov-file#use-the-access-token-function-based))

```javascript
export default function MessageList () {
  const { authState } = useOktaAuth();

  useEffect(() => {
    if (authState.isAuthenticated) {
      // request resource
    }
  }, [authState]);
}
```

This pattern is on longer recommended because the `.isAuthenticated` value on `appState` is a `boolean` flag representing whether or not the token is expired. However, token expiration is a function of time. Meaning, If `.isAuthenticated` was set 10 seconds ago, the value _really_ represents that the token was valid _10 seconds ago_, which may no longer be the case. 

Since token validity is a function of time, there isn't much point to tie the token lifecycle into the React App's state/lifecycle. It's now recommended to use methods like [`Credential.refreshIfNeeded()`](../api/spa-platform/classes/Credential#refreshifneeded) to attempt a refresh of a token before using it rather than relying on background processes to maintain a valid token.

### `<SecureRoute />`

The `<SecureRoute />` pattern may not be needed for similar reasons as above. Any component which consumes an `accessToken` to make authenticated resource request already needs to handle the pre-fetched and post-fetched app states. There isn't much of a difference between pre-authenticated and pre-fetched, so it may not be necessary to replicate this functionality. In addition, multiple resource requests within the same Component may require different scopes and therefore different tokens. Situations like this are better handled within the Component itself.

### `<LoginCallback />`

```javascript
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Credential } from '@okta/spa-platform';
import { signInFlow } from '@/auth';
import { Loading } from './Loading';

interface FlowCallbackProps {
  loadingElement?: React.ReactElement
}

async function handleAuthorizationCodeFlowResponse () {
  const { token, context } = await signInFlow.resume(window.location.href);

  const { tags, originalUri } = context;
  const cred = Credential.store(token, tags);

  return originalUri;
}

// prevents mutiple calls in strict mode
// https://react.dev/learn/you-might-not-need-an-effect#initializing-the-application
let flowResumed = false;

export const LoginCallback: React.FC<FlowCallbackProps> = ({ loadingElement = (<Loading />) }) => {
  const navigate = useNavigate();
  const [callbackError, setCallbackError] = useState<Error | null>(null);

  useEffect(() => {
    // prevents mutiple calls in strict mode
    if (!flowResumed) {
      handleAuthorizationCodeFlowResponse()
      .then((originalUri) => {
        navigate(originalUri ?? '/', { replace: true });
      })
      .catch(err => {
        // may want to improve error handling
        console.log(err, err.message);
        setCallbackError(err as unknown as Error);
      });

      flowResumed = true;
    }
  }, [signInFlow]);

  return loadingElement;
};

```

___
