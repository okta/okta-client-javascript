[@okta/react-native-platform](../../..) / [Flows](../../index.md) / [AuthorizationCodeFlow](../index.md) / BrowserSignInResult

# Type Alias: BrowserSignInResult

> **BrowserSignInResult** = [`Result`](Result.md) & `object` \| \{ `completed`: `false`; `reason`: `"closed"`; \} \| \{ `completed`: `false`; `reason`: `"failed"`; `error`: [`Error`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Error); \} \| \{ `completed`: `false`; `reason`: `"error"`; `error`: [`OAuth2Error`](/api/auth-foundation); \}

`completed: true` - happy path, returns token and request context

`completed: false`:
  - `reason: 'closed'` - Browser window was closed by user
  - `reason: 'error'`  - Authorization Code flow resulted in an OAuth error response
  - `reason: 'failed'` - Error was thrown during execution
