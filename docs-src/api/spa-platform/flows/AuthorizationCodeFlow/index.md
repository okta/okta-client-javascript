[@okta/spa-platform](../..) / [Flows](../index.md) / AuthorizationCodeFlow

# Class: AuthorizationCodeFlow

Browser-specific additions to [AuthorizationCodeFlow](/api/oauth2-flows/AuthorizationCodeFlow/)

## Extends

- [`AuthorizationCodeFlow`](/api/oauth2-flows/AuthorizationCodeFlow/)

## Authorize Methods

### PerformRedirect()

> `static` **PerformRedirect**(`flow`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>

Performs a browser full-page redirect to the `Authorization Server` `/authorize` endpoint.
Once authentication is successful, the user will be redirected back to the provided `redirectUri`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `flow` | `AuthorizationCodeFlow` |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>

#### Remarks

This method returns a `Promise` that will never fulfill; a browser redirect will occur first

#### See

* [AuthorizationCodeFlow.resume](/api/oauth2-flows)
* [SPA Platform: PerformRedirect](/api/spa-platform/#performredirect)

***

### PerformSilently()

> `static` **PerformSilently**(`flow`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Result`](type-aliases/Result.md)\>

Fulfills the `/authorize` request within a hidden iframe and therefore does *not* require a redirect.
This requires an existing cookie-based session with the IDP and is susceptible to third-party cookie restrictions.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `flow` | `AuthorizationCodeFlow` |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Result`](type-aliases/Result.md)\>

Returns a [Token](/api/auth-foundation/Token/) and the [AuthorizationCodeFlow.Context](interfaces/Context.md) used to request the token

#### Remarks

This approach is not recommended for most common use cases and may be deprecated in the future.
Use [AuthorizationCodeFlow.PerformRedirect](#performredirect) instead

#### See

- [Silent Authentication](https://auth0.com/docs/authenticate/login/configure-silent-authentication)
- [Third-party Cookie Deprecation](https://developers.google.com/privacy-sandbox/cookies)
- [SPA Platform: PerformSilently](/api/spa-platform/#performsilently)

***

### PerformInPopup()

> `static` **PerformInPopup**(`flow`, `popupWindow?`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`PopupResult`](type-aliases/PopupResult.md)\>

> [!IMPORTANT]
> Read carefully before use. This method (and popup pattern at large) has quite a few "gotchas"

Fulfills `/authorize` requests in a popup window. Not necessarily recommended for primary authentication flows,
but can be useful for step up authentication flows against a known IDP.

> [!NOTE]
> The phrase "external IDP" refers to an IDP other than the configured `issuer` for a given flow. See
> [Concepts: External Identity Providers](https://developer.okta.com/docs/concepts/identity-providers/) for a more detailed explanation

Utilizing external IDPs in a popup window may be susceptible to the IDP's `Cross-Origin-Opener-Policy`. Depending on their policy value,
loading the IDP in a popup window may cause the popup window to create a new browsing context group (BCG), seperate from the main
browser window. The authentication flow will be unable to complete if this occurs. It's recommended to avoid using this method (and a popup
in general) when utilizing external IDPs.

* [Cross-Origin-Opener-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Opener-Policy)
* [Browsing Context Group](https://developer.mozilla.org/en-US/docs/Glossary/Browsing_context)

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `flow` | `AuthorizationCodeFlow` | instance of AuthorizationCodeFlow to be used |
| `popupWindow?` | [`Window`](https://developer.mozilla.org/docs/Web/API/Window) | Optionally, a `Window` object (representing a popup window) can be provided. Providing a popup reference can be useful when control over the popup's attributes, like name and size, is required. In addition, the popup window will first load the base route (`/`) of the web application. Some browser implement heustistics which can block popups spawned from `async` processes. Loading the base route before navigating to `/authorize` helps reduce the likelihood the popup gets blocked. To override this behavior, provide a popup reference |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`PopupResult`](type-aliases/PopupResult.md)\>

Success response:
| Property | Type | Description |
| ------ | ------ | ------ |
| `completed` | `true` | Indicates the flow completed successfully |
| `token` | [Token](/api/auth-foundation/Token/) | The resulting token from the successful flow |
| `context` | `Record<string, any>` | Developer-provided (pre-auth) metadata about the token |

Unsuccessful response:
| Property | Type | Description |
| ------ | ------ | ------ |
| `completed` | `false` | Indicates the flow **did not** complete |
| `reason` | `'closed'` or `'blocked'` | Indicates the _reason_ the flow did not complete |

  - `'closed'` indicates the user manually closed the popup window
  - `'blocked'` indicates the popup window was unable to be opened (presumably by a popup blocker or browser heustistics)

#### See

- [SPA Platform: PerformInPopup](/api/spa-platform/#performinpopup)

## Interfaces

| Interface | Description |
| ------ | ------ |
| [RedirectValues](interfaces/RedirectValues.md) | Values parsed from a successful redirect back from the Authorization Server |
| [Context](interfaces/Context.md) | Values needed to initiate an Authorization Code flow |

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [Result](type-aliases/Result.md) | The result of successfully completing an Authorization Code flow via [AuthorizationCodeFlow.resume](/api/oauth2-flows) |
| [PopupResult](type-aliases/PopupResult.md) | The possible results from [AuthorizationCodeFlow.PerformInPopup](index.md#performinpopup) |
