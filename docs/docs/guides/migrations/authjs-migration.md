---
slug: /migrations/okta-auth-js
id: "authjs"
title: "Migration from @okta/okta-auth-js"
sidebar_label: "@okta/okta-auth-js"
custom_edit_url: null
toc_max_heading_level: 4
---

## Cheat Sheet
| `okta-authjs` | Equivalent | Library | Example
| :------ | :------ | :------ | :------ |
[signInWithRedirect()](https://github.com/okta/okta-auth-js?tab=readme-ov-file#signinwithredirectoptions) | [AuthorizationCodeFlow](../api/spa-oauth2-flows/classes/AuthorizationCodeFlow#performredirect) | `spa-oauth2-flows` | [Example](#signinwithredirect)
[token.getWithoutPrompt()](https://github.com/okta/okta-auth-js?tab=readme-ov-file#tokengetwithoutpromptoptions) | [AuthorizationCodeFlow](../api/spa-oauth2-flows/classes/AuthorizationCodeFlow#performsilently) | `spa-oauth2-flows` | [Example](#tokengetwithoutprompt)
[signOut](https://github.com/okta/okta-auth-js?tab=readme-ov-file#signout) | [SessionLogoutFlow](../api/spa-oauth2-flows/classes/SessionLogoutFlow) | `spa-oauth2-flows` | [Example](#signout)
[handleLoginRedirect()](https://github.com/okta/okta-auth-js?tab=readme-ov-file#handleloginredirecttokens-originaluri) | [`AuthorizationCodeFlow.remove()`](../api/spa-oauth2-flows/classes/AuthorizationCodeFlow#resume) | `spa-oauth2-flows` | [Example](#signinwithredirect) | `spa-oauth2-flows` | [Example](#handleloginredirect)
[isAuthenticated()](https://github.com/okta/okta-auth-js?tab=readme-ov-file#isauthenticatedoptions) | [`Credential.refreshIfNeeded()`](../api/spa-platform/classes/Credential#refreshifneeded) | `spa-platform` | [Example](#isauthenticated)


### `signInWithRedirect()`
> Note: [signInWithRedirect()](https://github.com/okta/okta-auth-js?tab=readme-ov-file#signinwithredirectoptions) and [token.getWithRedirect](https://github.com/okta/okta-auth-js?tab=readme-ov-file#tokengetwithredirectoptions) are essentially the same method

> Note: Tokens will be stored via the LoginCallback

```javascript
export const signInFlow = new AuthorizationCodeFlow({
  ...oauthConfig,
  redirectUri: `${window.location.origin}/login/callback`,
});

export async function signIn (originalUri = window.location.href) {
  const url = new URL(originalUri);
  await signInFlow.start({ originalUri: url.pathname });
  return AuthorizationCodeFlow.PerformRedirect(signInFlow);
}
```

### `token.getWithoutPrompt()`

```javascript
export const signInFlow = new AuthorizationCodeFlow({
  ...oauthConfig,
  redirectUri: `${window.location.origin}/login/callback`,
});

export async function signIn () {
  const { token } = await AuthorizationCodeFlow.PerformSilently(signInFlow);
  Credential.store(token);
}
```

### `signOut`
> Note: Signing out a user is not "one-size fits all" in a multi-token architecture. The following example assumes a single (default) token

```javascript
export const signOutFlow = new SessionLogoutFlow({
  ...oauthConfig,
  logoutRedirectUri: `${window.location.origin}`
});

export async function signOut () {
  const idToken = Credential.default?.token?.idToken?.rawValue;
  if (idToken) {
    const logoutUrl = await signOutFlow.start(idToken);
    Credential.default.remove();  // will be revoked via logout call, but needs to be removed from storage
    window.location.assign(logoutUrl);
  }
}
```

### `handleLoginRedirect()`

```javascript
async function handleAuthorizationCodeFlowResponse () {
  const { token, context } = await signInFlow.resume(window.location.href);

  const { tags, originalUri } = context;
  const cred = Credential.store(token, tags);

  window.location.replace(originalUri);
}
```

### `isAuthenticated()`
> Note: this example is for illustration purposes. It's recommended to use [`FetchClient`](../api-design#sending-authorized-api-requests) for requesting protected resources

```javascript
export async function fetchData () {
  // fetches token from storage
  const credential = Credential.default;

  if (!credential) {
    // trigger sign in if no token exists
    return signIn();
  }

  try {
    // attempt to refresh token, if expired
    await credential.refreshIfNeeded();
  }
  catch (err) {
    // trigger sign in if expired token cannot be refresh
    return signIn();
  }

  // happy path: fetch protected resource
  return fetch('/api/resource/', {
    headers: { Authorization: `Bearer ${credential.token.accessToken}`}
  });
}
```

___
