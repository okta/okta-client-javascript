[@okta/react-native-platform](../..) / [Flows](../index.md) / AuthorizationCodeFlow

# Class: AuthorizationCodeFlow

## Extends

- [`AuthorizationCodeFlow`](/api/oauth2-flows/AuthorizationCodeFlow/)

## Properties

### defaultBrowserSessionOptions

> `static` **defaultBrowserSessionOptions**: `BrowserSessionOptions`

## Methods

### PerformBrowserSignIn()

> `static` **PerformBrowserSignIn**(`flow`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`BrowserSignInResult`](type-aliases/BrowserSignInResult.md)\>

Performs an Authorization Code flow by opening the `Authorization Server` `/authorize` endpoint
in a native browser session (see [AuthorizationCodeFlow.defaultBrowserSessionOptions](#defaultbrowsersessionoptions))

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `flow` | `AuthorizationCodeFlow` | The AuthorizationCodeFlow instance to sign in with. If it isn't already [in progress](/api/oauth2-flows), it will be started |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`BrowserSignInResult`](type-aliases/BrowserSignInResult.md)\>

A [AuthorizationCodeFlow.BrowserSignInResult](type-aliases/BrowserSignInResult.md) describing whether sign-in completed,
and why it didn't if not

#### Remarks

Defaults to an ephemeral (non-persistent) browser session, unlike this library's general default
of `ephemeralSession: false`. This is intentional: on React Native, an OIDC logout can't reliably
clear a *persistent* browser session, since Android Chrome windows require user interaction and
aren't part of the current logout flow. Signing in with an ephemeral session instead avoids
leaving behind browser-level auth state that logout would otherwise be unable to clean up.

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [Result](type-aliases/Result.md) | The result of successfully completing an Authorization Code flow via [AuthorizationCodeFlow.resume](/api/oauth2-flows) |
| [BrowserSignInResult](type-aliases/BrowserSignInResult.md) | `completed: true` - happy path, returns token and request context |
