# @okta/oauth2-flows

Generic, platform-agnostic implementations of OAuth2 flows

It's very unlikely Application developers will want to use this library directly. Instead reach for a Platform library like `@okta/spa-platform` or `@okta/react-native-platform`. All Platform libraries re-export the contents of this library via the `/flows` sub path (`@okta/spa-platform/flows`)

> [!NOTE]
> Flow classes will only exist in platform libraries if the flow makes sense in the corresponding environment

## Requirements

This library depends on the [`WebCrypto API`](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) which is supported by modern browsers and NodeJS 20+

`@okta/auth-foundation` is a required peer dependency

## Installation

```sh
yarn add @okta/auth-foundation @okta/oauth2-flows
```

## Flows

Every flow class in this library extends `AuthenticationFlow` (or its subclass, `LogoutFlow`), which
provides the bits every flow needs regardless of platform:

- `inProgress` — whether the flow is currently running. A flow throws `AuthenticationFlowError` if
  `start()` is called while another `start()`/`resume()` is already in progress
- An event emitter (`on`/`off`) with `flow_started`, `flow_stopped`, and `flow_errored` events
- `reset()` — clears in-progress state; called automatically once a flow completes or errors

`AuthenticationFlow.Options` (`issuer`, `clientId`, `scopes`, `dpop`) is shared by every flow's
`InitOptions`, used when constructing a flow without an existing `OAuth2Client`:

```ts
import { AuthorizationCodeFlow } from '@okta/oauth2-flows';

// constructs an `OAuth2Client` internally from `issuer`/`clientId`/`scopes`
const flow = new AuthorizationCodeFlow({
  issuer: 'https://your-org.okta.com/oauth2/default',
  clientId: '...',
  scopes: ['openid', 'profile', 'offline_access'],
  redirectUri: 'https://your-app.example.com/login/callback'
});
```

Alternatively, an existing `OAuth2Client` can be passed in directly — useful when multiple flows
need to share the same client/configuration:

```ts
import { OAuth2Client } from '@okta/auth-foundation';
import { AuthorizationCodeFlow, SessionLogoutFlow } from '@okta/oauth2-flows';

const client = new OAuth2Client({ ... });

const signInFlow = new AuthorizationCodeFlow(client, { redirectUri: '...' });
const signOutFlow = new SessionLogoutFlow(client, { logoutRedirectUri: '...' });
```

### Authorization Code Flow

An implementation of [Authorization Code Flow](/docs/references/authorization_code_flow) with PKCE. Currently only supports Zero Trust Clients.

```ts
const client = new OAuth2Client(params);
const signInFlow = new AuthorizationCodeFlow(client, {
  redirectUri: `${window.location.origin}/login/callback`
});

const signInUrl = await signInFlow.start();
window.location.assign(signInUrl);

// User authenticates by interacting with UI hosted by Authorization Server

// Upon successful authentication and after a redirect to `redirectUri`

const { token, context } = await signInFlow.resume(window.location.href);
```

`start()` generates PKCE/state/nonce values, persists them (see [Transaction Storage](#transaction-storage)
below), and returns the `/authorize` URL to navigate to — how that navigation actually happens
(full-page redirect, hidden iframe, popup, native browser session, ...) is left entirely to the
Platform library, which is why this package never performs the navigation itself.

`resume()` is expected to be called once execution reaches `redirectUri`, parsing the returned
`code`/`state` (or OAuth2 error response) out of the URL, loading back the transaction saved by
`start()`, and exchanging the code for tokens.

### Session Logout Flow

An implementation of [RP-Initiated Logout](/docs/references/session_logout_flow).

```ts
const client = new OAuth2Client(params);
const signOutFlow = new SessionLogoutFlow(client, {
  logoutRedirectUri: `${window.location.origin}/logout`
});

const signOutUrl = await signOutFlow.start();
window.location.assign(signOutUrl);
```

`start()` can also be called with a full `SessionLogoutFlow.Context` (rather than just an ID
token) if more control over the `/logout` request is needed. As with Authorization Code Flow, this
package only builds the `end_session_endpoint` URL — navigating to it is left to the Platform
library.

> [!NOTE]
> `SessionLogoutFlow` builds a redirect URL; it does not itself revoke tokens. Whether the
> Authorization Server's `end_session_endpoint` invalidates the session server-side is
> IDP-dependent. To revoke a specific token, use `Credential.revoke()` from `@okta/auth-foundation`.

## Transaction Storage

`AuthorizationCodeFlow.start()` persists PKCE/state/nonce values across the redirect to and from
the Authorization Server via `AuthTransaction.storage`, a static, swappable property shared by all
`AuthTransaction` instances:

```ts
import { AuthTransaction, type TransactionStorage } from '@okta/oauth2-flows';

class MyTransactionStorage implements TransactionStorage {
  async get (key: string) { /* ... */ }
  async add (key: string, item: JsonRecord) { /* ... */ }
  async remove (key: string) { /* ... */ }
}

AuthTransaction.storage = new MyTransactionStorage();
```

The default implementation (`DefaultTransactionStorage`) is a simple in-memory `Map` and is
**not** suitable for production use — a full-page redirect during Authorization Code Flow clears
in-memory state entirely. Platform libraries replace `AuthTransaction.storage` with a
persistence-backed implementation appropriate to their environment (e.g. `sessionStorage` in a
browser) as part of their own default entry point's side effects.

## Errors

- `AuthenticationFlowError` — thrown when a flow is used incorrectly, such as calling `start()`
  while another invocation is already `inProgress`
- `LogoutFlowError` — the `LogoutFlow`-specific equivalent (currently behaves identically;
  kept separate so logout-specific error handling can be introduced later without a breaking change)

Both extend `AuthSdkError` from `@okta/auth-foundation`, and every flow's `flow_errored` event
includes the thrown error via `{ error }`.
