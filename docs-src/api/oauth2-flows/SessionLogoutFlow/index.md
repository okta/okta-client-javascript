[@okta/oauth2-flows](..) / SessionLogoutFlow

# Class: SessionLogoutFlow

An implementation of OIDC logout

## Example

```typescript
const client = new OAuth2Client(params);
const signOutFlow = new SessionLogoutFlow(client, {
  logoutRedirectUri: `${window.location.origin}/logout`
});

await clearDPoPKeyPairs();   // OPTIONAL

const signOutUrl = await signOutFlow.start();
window.location.assign(signOutUrl);
```

## See

* [Okta Documentation](https://developer.okta.com/docs/api/openapi/okta-oauth/oauth/tag/OrgAS/#tag/OrgAS/operation/logoutWithPost)
* [OIDC RP-Initiated Logout 1.0](https://openid.net/specs/openid-connect-rpinitiated-1_0.html)

## Extends

- [`LogoutFlow`](../Core/LogoutFlow/index.md)

## Constructors

### Constructor

> **new SessionLogoutFlow**(`options`): `SessionLogoutFlow`

Constructs a new [OAuth2Client](/api/auth-foundation) internally from `options`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`InitOptions`](interfaces/InitOptions.md) |

#### Returns

`SessionLogoutFlow`

#### Overrides

[`LogoutFlow`](../Core/LogoutFlow/index.md).[`constructor`](../Core/LogoutFlow/index.md#constructor)

### Constructor

> **new SessionLogoutFlow**(`client`, `options`): `SessionLogoutFlow`

Uses an existing [OAuth2Client](/api/auth-foundation) instance

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `client` | [`OAuth2Client`](/api/auth-foundation) |
| `options` | [`LogoutParams`](type-aliases/LogoutParams.md) |

#### Returns

`SessionLogoutFlow`

#### Overrides

`LogoutFlow.constructor`

## Properties

### emitter

> `protected` `readonly` **emitter**: [`EventEmitter`](/api/auth-foundation)\<[`AuthenticationFlowEvents`](../Core/type-aliases/AuthenticationFlowEvents.md)\>

Possible events: [AuthenticationFlowEvents](../Core/type-aliases/AuthenticationFlowEvents.md)

#### Inherited from

[`LogoutFlow`](../Core/LogoutFlow/index.md).[`emitter`](../Core/LogoutFlow/index.md#emitter)

***

### client

> `readonly` **client**: [`OAuth2Client`](/api/auth-foundation)

***

### logoutRedirectUri

> `readonly` **logoutRedirectUri**: `string`

***

### additionalParameters

> `readonly` **additionalParameters**: [`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)\<`string`, `string`\>

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

[`LogoutFlow`](../Core/LogoutFlow/index.md).[`inProgress`](../Core/LogoutFlow/index.md#inprogress)

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

[`LogoutFlow`](../Core/LogoutFlow/index.md).[`on`](../Core/LogoutFlow/index.md#on)

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

[`LogoutFlow`](../Core/LogoutFlow/index.md).[`off`](../Core/LogoutFlow/index.md#off)

***

### reset()

> **reset**(): `void`

Resets the flow, marking it as no longer [AuthenticationFlow.inProgress](../Core/AuthenticationFlow/index.md#inprogress).
Subclasses should override this to additionally clear any in-progress flow state,
calling `super.reset()` to also reset [AuthenticationFlow.inProgress](../Core/AuthenticationFlow/index.md#inprogress)

#### Returns

`void`

#### Inherited from

[`LogoutFlow`](../Core/LogoutFlow/index.md).[`reset`](../Core/LogoutFlow/index.md#reset)

***

### start()

#### Call Signature

> **start**(`idToken`, `additionalParameters?`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`URL`](https://developer.mozilla.org/docs/Web/API/URL)\>

Initiates a logout using just an ID token

##### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `idToken` | `string` | The ID token to be passed as `id_token_hint` |
| `additionalParameters?` | [`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)\<`string`, `string`\> | **Optional.** A map of URL query parameters to be added to the `/logout` request |

##### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`URL`](https://developer.mozilla.org/docs/Web/API/URL)\>

A [URL](https://developer.mozilla.org/en-US/docs/Web/API/URL/URL) instance representing `Authorization Server` `/logout`
with all required query parameters

#### Call Signature

> **start**(`context`, `additionalParameters?`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`URL`](https://developer.mozilla.org/docs/Web/API/URL)\>

Initiates a logout using an explicit [SessionLogoutFlow.Context](interfaces/Context.md)

##### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `context` | [`Context`](interfaces/Context.md) | [SessionLogoutFlow.Context](interfaces/Context.md) describing the logout request |
| `additionalParameters?` | [`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)\<`string`, `string`\> | **Optional.** A map of URL query parameters to be added to the `/logout` request |

##### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`URL`](https://developer.mozilla.org/docs/Web/API/URL)\>

A [URL](https://developer.mozilla.org/en-US/docs/Web/API/URL/URL) instance representing `Authorization Server` `/logout`
with all required query parameters

## Interfaces

| Interface | Description |
| ------ | ------ |
| [InitOptions](interfaces/InitOptions.md) | Options required to construct a [SessionLogoutFlow](index.md) instance |
| [Context](interfaces/Context.md) | Values needed to initiate a session logout |

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [LogoutParams](type-aliases/LogoutParams.md) | Params needed when constructing a [SessionLogoutFlow](index.md) from an existing [AuthFoundation!OAuth2Client](/api/auth-foundation) |
