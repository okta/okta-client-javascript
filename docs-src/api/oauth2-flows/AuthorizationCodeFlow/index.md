[@okta/oauth2-flows](..) / AuthorizationCodeFlow

# Class: AuthorizationCodeFlow

An implementation of Authorization Code Flow

## Remarks

Currently only supports Zero Trust Clients

## Example

```typescript
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

## See

Okta Documentation:
- [Okta: Concepts](https://developer.okta.com/docs/concepts/oauth-openid/#authorization-code-flow-with-pkce-flow)
- [Okta: Guide](https://developer.okta.com/docs/guides/implement-grant-type/authcode/main/#authorization-code-flow)

Additional References:
- [Auth0](https://auth0.com/docs/get-started/authentication-and-authorization-flow/authorization-code-flow)
- [OAuth.net](https://oauth.net/2/grant-types/authorization-code)
- [RFC 6749 - Authorization Code](https://datatracker.ietf.org/doc/html/rfc6749#section-1.3.1)

## Extends

- [`AuthenticationFlow`](../Core/AuthenticationFlow/index.md)

## Constructors

### Constructor

> **new AuthorizationCodeFlow**(`options`): `AuthorizationCodeFlow`

Constructs a new [OAuth2Client](/api/auth-foundation) internally from `options`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`InitOptions`](interfaces/InitOptions.md) |

#### Returns

`AuthorizationCodeFlow`

#### Overrides

[`AuthenticationFlow`](../Core/AuthenticationFlow/index.md).[`constructor`](../Core/AuthenticationFlow/index.md#constructor)

### Constructor

> **new AuthorizationCodeFlow**(`client`, `options`): `AuthorizationCodeFlow`

Uses an existing [OAuth2Client](/api/auth-foundation) instance

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `client` | [`OAuth2Client`](/api/auth-foundation) |
| `options` | [`RedirectParams`](type-aliases/RedirectParams.md) |

#### Returns

`AuthorizationCodeFlow`

#### Overrides

`AuthenticationFlow.constructor`

## Properties

### emitter

> `protected` `readonly` **emitter**: [`EventEmitter`](/api/auth-foundation)\<[`AuthenticationFlowEvents`](../Core/type-aliases/AuthenticationFlowEvents.md)\>

Possible events: [AuthenticationFlowEvents](../Core/type-aliases/AuthenticationFlowEvents.md)

#### Inherited from

[`AuthenticationFlow`](../Core/AuthenticationFlow/index.md).[`emitter`](../Core/AuthenticationFlow/index.md#emitter)

***

### client

> `readonly` **client**: [`OAuth2Client`](/api/auth-foundation)

***

### redirectUri

> `readonly` **redirectUri**: `string`

***

### additionalParameters

> `readonly` **additionalParameters**: [`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)\<`string`, `string`\>

***

### context

> `protected` **context**: [`Context`](interfaces/Context.md) \| `null` = `null`

***

### authorizeUrl

> `protected` **authorizeUrl**: [`URL`](https://developer.mozilla.org/docs/Web/API/URL) \| `null` = `null`

## Accessors

### inProgress

#### Get Signature

> **get** **inProgress**(): `boolean`

Whether this flow is currently in progress. Setting this value emits
[flow\_started](../Core/type-aliases/AuthenticationFlowEvents.md#property-flow_started) or
[flow\_stopped](../Core/type-aliases/AuthenticationFlowEvents.md#property-flow_stopped)

##### Returns

`boolean`

#### Set Signature

> **set** **inProgress**(`inProgess`): `void`

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `inProgess` | `boolean` |

##### Returns

`void`

#### Inherited from

[`AuthenticationFlow`](../Core/AuthenticationFlow/index.md).[`inProgress`](../Core/AuthenticationFlow/index.md#inprogress)

***

### isAuthenticating

#### Get Signature

> **get** **isAuthenticating**(): `boolean`

Whether this flow is currently in progress. Setting this value emits
[flow\_started](../Core/type-aliases/AuthenticationFlowEvents.md#property-flow_started) or
[flow\_stopped](../Core/type-aliases/AuthenticationFlowEvents.md#property-flow_stopped)

##### Returns

`boolean`

## Methods

### on()

> **on**(...`args`): `void`

Alias for `emitter.on`.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| ...`args` | \[keyof [`AuthenticationFlowEvents`](../Core/type-aliases/AuthenticationFlowEvents.md), (() => `void`) \| ((`event`) => `void`)\] |

#### Returns

`void`

#### See

[EventEmitter.on](/api/auth-foundation/Core/classes/EventEmitter/#on)

#### Inherited from

[`AuthenticationFlow`](../Core/AuthenticationFlow/index.md).[`on`](../Core/AuthenticationFlow/index.md#on)

***

### off()

> **off**(...`args`): `void`

Alias for `emitter.off`.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| ...`args` | \[keyof [`AuthenticationFlowEvents`](../Core/type-aliases/AuthenticationFlowEvents.md), (() => `void`) \| ((`event`) => `void`)\] |

#### Returns

`void`

#### See

[EventEmitter.off](/api/auth-foundation/Core/classes/EventEmitter/#off)

#### Inherited from

[`AuthenticationFlow`](../Core/AuthenticationFlow/index.md).[`off`](../Core/AuthenticationFlow/index.md#off)

***

### reset()

> **reset**(): `void`

Resets the flow, marking it as no longer [AuthenticationFlow.inProgress](../Core/AuthenticationFlow/index.md#inprogress).
Subclasses should override this to additionally clear any in-progress flow state,
calling `super.reset()` to also reset [AuthenticationFlow.inProgress](../Core/AuthenticationFlow/index.md#inprogress)

#### Returns

`void`

#### Overrides

[`AuthenticationFlow`](../Core/AuthenticationFlow/index.md).[`reset`](../Core/AuthenticationFlow/index.md#reset)

***

### start()

> **start**(`stateData?`, `context?`, `additionalParameters?`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`URL`](https://developer.mozilla.org/docs/Web/API/URL)\>

Initiates an Authorization Code flow

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `stateData` | [`JsonRecord`](/api/auth-foundation) | A map of key/values to be loaded upon redirect from `Authorization Server` back to `Web App` |
| `context` | [`Partial`](https://www.typescriptlang.org/docs/handbook/utility-types.html#partialtype)\<[`Context`](interfaces/Context.md)\> | **Optional.** [AuthorizationCodeFlow.Context](interfaces/Context.md) can be provided. One will be created if none is provided |
| `additionalParameters` | [`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)\<`string`, `string`\> | **Optional.** A map of URL query parameters to be added to the `/authorize` request |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`URL`](https://developer.mozilla.org/docs/Web/API/URL)\>

A [URL](https://developer.mozilla.org/en-US/docs/Web/API/URL/URL) instance representing `Authorization Server` `/authorize`
with all required query parameters

***

### resume()

> **resume**(`redirectUri`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Result`](type-aliases/Result.md)\>

Continues an Authorization Code flow. Used when handling the redirect back to the `Web App` from an `Authorization Server`

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `redirectUri` | `string` \| [`URL`](https://developer.mozilla.org/docs/Web/API/URL) \| [`URLSearchParams`](https://developer.mozilla.org/docs/Web/API/URLSearchParams) | The full redirect-back URL (or just its search params), containing either an authorization `code` and `state`, or an OAuth2 error response |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Result`](type-aliases/Result.md)\>

The exchanged [Token](/api/auth-foundation) along with any `stateData` originally passed to [AuthorizationCodeFlow.start](#start)

#### Remarks

This method will only be used with `Redirect Model`

## Interfaces

| Interface | Description |
| ------ | ------ |
| [InitOptions](interfaces/InitOptions.md) | Options required to construct a [AuthorizationCodeFlow](index.md) instance |
| [RedirectValues](interfaces/RedirectValues.md) | Values parsed from a successful redirect back from the Authorization Server |
| [Context](interfaces/Context.md) | Values needed to initiate an Authorization Code flow |

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [RedirectParams](type-aliases/RedirectParams.md) | Params needed when constructing an [AuthorizationCodeFlow](index.md) from an existing [OAuth2Client](/api/auth-foundation) |
| [Result](type-aliases/Result.md) | The result of successfully completing an Authorization Code flow via [AuthorizationCodeFlow.resume](index.md#resume) |
