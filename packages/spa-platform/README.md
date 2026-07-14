---
outline: [2, 3]
---

# @okta/spa-platform

Platform library for browser environments for the Okta Client JavaScript ecosystem

Complete documentation at TODO

## Requirements

This library depends on the [`WebCrypto API`](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) which is supported by modern browsers

> This library does not support Internet Explorer

## Installation

```sh
yarn add @okta/auth-foundation @okta/spa-platform
# optionally include @okta/oauth2-flows
```

## Entry Points

(Recommended) Importing `@okta/spa-platform` has the following side effects:

- Registers the `@okta/spa-platform` Platform defaults
- Replaces `CredentialCoordinator.tokenStorage` with `BrowserTokenStorage`

All core exports are available via `@okta/spa-platform/core` to avoid the side effects, if required. Although, the `core` export is unlikely to result in desired functionality out-of-the-box.

To perform OAuth2 flows (like Authorization Code flow) a peer dependency of `@okta/oauth2-flows` is required. All features dependent on `@okta/oauth2-flows` are exported from `@okta/spa-platform/flows`, so `@okta/oauth2-flows` can be listed as a optional peer dependency

> All exports from `@okta/auth-foundation` and `@okta/oauth2-flows` are re-exported from `@okta/spa-platform`. Always import from `@okta/spa-platform` or a subpath

## Usage

### `isModernBrowser`

TODO

TODO

## Platform

### `BrowserTokenStorage`

Default implementation of `TokenStorage` backend by [localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)

By default, all tokens will be encrypted (via `AES-GCM`) before being written to storage. `Token.Metadata` is stored separately an unencrypted.
This enables storage queries (via `Credential.find`) to search on claims without decrypting tokens

#### Configurations

| Property | Description | Default |
| ------ | ------ | ------ |
| `tokenPrefix` | A storage key prefix to identify entries by. | `'oauth-token'` |
| `encryptAtRest` | When `true`, tokens will be encrypted (via `AES-GCM`) before being written to storage. | `true` |
| `includeClaims` | When `true`, includes `idToken` claims in stored `Token.Metadata`. This includes `claims` within `Credential.find` queries | `true` |
| `encryptionKeyStore` | A [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)-backed store for managing storage encryption key(s)  | `new IndexedDBStore<CryptoKey>('StorageKeys')` |
| `encryptionKeyName` | Key name of the storage encryption key with the `encryptionKeyStore` | `'EncryptionKey'` |

#### Customizing

> [!Tip]
> Updating storage configurations (or instances altogether) should happen at application bootstrap time. Making dynamic changes within an application's lifecycle may have unpredicatable results

Configuration properties can be updated directly

```ts
import { Credential } from '@okta/spa-platform';

// Reference to default `BrowserTokenStorage` instance
Credential.coordinator.tokenStorage;

// Updates configuration property
Credential.coordinator.tokenStorage.includeClaims = false;
```

Or the storage class can be extended

```ts
import { Credential, BrowserTokenStorage } from '@okta/spa-platform';

class MyTokenStorage extends BrowserTokenStorage {
  includeClaims = false;

  protected async handleReadError (error: unknown, id: string) {
    throw new TypeError('Something went wrong');
  }
}

Credential.coordinator.tokenStorage = new MyTokenStorage();
```

## Authorization Code Flow

Browser-specific ultilies methods for performing [Authorization Code Flow](/docs/references/authorization_code_flow) in a browser environment.

### `PerformRedirect` [:book:](/api/spa-platform/flows/AuthorizationCodeFlow/#performredirect)

> **Recommended Appoarch** 

Performs a browser full-page redirect to the Authorization Server `/authorize` endpoint.
Once authentication is successful, the user will be redirected back to the provided `redirectUri`

> [!Tip]
> This requires the SPA handles the redirect at the provided `redirectUri` path via `.resume()`

```ts
import { OAuth2Client, Credential } from '@okta/spa-platform';
import { AuthorizationCodeFlow } from '@okta/spa-platform/flows';

const client = new OAuth2Client({ ... });

const flow = new AuthorizationCodeFlow(client, {
  redirectUri: REDIRECT_URI
});

export async function performSignIn () {
  // NOTE: the resulting `Promise` from `PerformRedirect` never fulfills, 
  // so execution is blocking until the full-page direct occurs
  return AuthorizationCodeFlow.PerformRedirect(flow);
}

// **MUST** be invoked at the `redirectUri` path to handle the redirect
// from the authorization server
export async function handleAuthorizationCodeFlowResponse () {
  const { token } = await flow.resume(window.location.href);
  await Credential.store(token);
}
```

### `PerformSilently` [:book:](/api/spa-platform/flows/AuthorizationCodeFlow/#performsilently)

Fulfills the `/authorize` request within a hidden iframe and therefore does *not* require a redirect. Does not prompt the user for credentials, however requires an existing IDP session; persumably the user was already prompted to establish this session. IDP sessions are (usually) cookie-based and therefore are susceptible to third-party cookie restrictions as well.

This approach is not recommended for most cases.

```ts
import { OAuth2Client, Credential } from '@okta/spa-platform';
import { AuthorizationCodeFlow } from '@okta/spa-platform/flows';

const client = new OAuth2Client({ ... });

const flow = new AuthorizationCodeFlow(client, {
  redirectUri: REDIRECT_URI
});

export async function performSignIn () {
  const { token } = await AuthorizationCodeFlow.PerformSilently(flow);
  await Credential.store(token);
}
```

### `PerformInPopup` [:book:](/api/spa-platform/flows/AuthorizationCodeFlow/#performinpopup)

> [!IMPORTANT]
> Read carefully before use. This method (and popup pattern at large) has quite a few "gotchas"

Fulfills `/authorize` requests in a popup window. Not necessarily recommended for primary authentication flows, but can be useful for step up authentication flows against known IDPs.

> [!NOTE]
> The phrase "external IDP" refers to an IDP other than the configured `issuer` for a given flow. See
> [Concepts: External Identity Providers](https://developer.okta.com/docs/concepts/identity-providers/) for a more detailed explanation

Utilizing external IDPs in a popup window will be susceptible to the IDP's [`Cross-Origin-Opener-Policy`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cross-Origin-Opener-Policy). Depending on their policy value, loading the IDP in a popup window may cause the popup window to create a new browsing context group ([BCG](https://developer.mozilla.org/en-US/docs/Glossary/Browsing_context)), seperate from the main browser window. The authentication flow will be unable to complete if this occurs. It's recommended to avoid using this method (and a popup in general) when utilizing external IDPs.

```ts
import { OAuth2Client, Credential } from '@okta/spa-platform';
import { AuthorizationCodeFlow } from '@okta/spa-platform/flows';

const client = new OAuth2Client({ ... });

const flow = new AuthorizationCodeFlow(client, {
  redirectUri: REDIRECT_URI
});

export async function performSignIn () {
  const result = await AuthorizationCodeFlow.PerformInPopup(flow);

  if (result.completed) {
    await Credential.store(result.token);
  }
  else {
    // handle unsuccessful auth
    // `result.reason` - `'closed'` or `'blocked'`
  }
}
```

## Session Logout Flow

Browser-specific ultilies methods for performing [OIDC RP-Initiated Logout](https://openid.net/specs/openid-connect-rpinitiated-1_0.html) in a browser environment.

### `PerformPostRedirect` [:book:](/api/spa-platform/flows/SessionLogoutFlow/#performpostredirect)

Performs a full-page redirect to IDP OIDC `end_session_endpoint` via generated hidden `<form method="POST">`.

Performing a `POST` request (instead of `GET` which supported by most IDPs) avoids leaking the `id_token` within the URL query params.
