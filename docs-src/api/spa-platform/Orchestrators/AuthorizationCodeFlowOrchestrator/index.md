[@okta/spa-platform](../..) / [Orchestrators](../index.md) / AuthorizationCodeFlowOrchestrator

# Class: AuthorizationCodeFlowOrchestrator\<E\>

An implementation of [TokenOrchestrator](/api/auth-foundation/TokenOrchestrator/) leveraging 
[AuthorizationCodeFlow](../../Flows/classes/AuthorizationCodeFlow.md)

Out-of-the-box this orchestrator will handle performing [Authorzation Code flow](/docs/references/authorization_code_flow) as well
as storing and refreshing tokens.

> [!IMPORTANT]
> `AuthorizationCodeFlowOrchestrator` is **NOT** available from the default export since it requires `@okta/oauth2-flows`.
>
> Use `import { AuthorizationCodeFlowOrchestrator } from '@okta/spa-platform/flows'`.

## Remarks

`AuthorizationCodeFlowOrchestrator` defaults to [PerformRedirect](../../Flows/classes/AuthorizationCodeFlow.md#performredirect). This requires the application
handles the redirect via [AuthorizationCodeFlowOrchestrator.resumeFlow](#resumeflow).

## See

* [SPA Platform: Authorization Code Flow](/api/spa-platform/#authorization-code-flow)
* [AuthorizationCodeFlow](../../Flows/classes/AuthorizationCodeFlow.md)

## Type Parameters

| Type Parameter | Default type | Description |
| ------ | ------ | ------ |
| `E` *extends* [`Events`](interfaces/Events.md) | [`Events`](interfaces/Events.md) | Map of all events fired from [TokenOrchestrator.emitter](/api/auth-foundation) |

## Constructors

### Constructor

> **new AuthorizationCodeFlowOrchestrator**\<`E`\>(`flow`, `init?`): `AuthorizationCodeFlowOrchestrator`\<`E`\>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `flow` | [`AuthorizationCodeFlow`](../../Flows/classes/AuthorizationCodeFlow.md) |
| `init` | [`Partial`](https://www.typescriptlang.org/docs/handbook/utility-types.html#partialtype)\<[`Options`](type-aliases/Options.md)\> |

#### Returns

`AuthorizationCodeFlowOrchestrator`\<`E`\>

#### Overrides

`TokenOrchestrator<E>.constructor`

## Properties

### emitter

> `protected` `readonly` **emitter**: [`EventEmitter`](/api/auth-foundation)\<`E`\>

Possible events: [AuthorizationCodeFlowOrchestrator.Events](interfaces/Events.md)

#### Overrides

`TokenOrchestrator.emitter`

***

### options

> **options**: [`Options`](type-aliases/Options.md) = `defaultOptions`

***

### flow

> `readonly` **flow**: [`AuthorizationCodeFlow`](../../Flows/classes/AuthorizationCodeFlow.md)

## Methods

### on()

> **on**(...`args`): [`EventEmitter`](/api/auth-foundation)\<`E`\>

alias for `this.emitter.on`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| ...`args` | \[keyof `E`, [`EventListener`](/api/auth-foundation)\<`E`\[keyof `E`\]\>\] |

#### Returns

[`EventEmitter`](/api/auth-foundation)\<`E`\>

#### Inherited from

`TokenOrchestrator.on`

***

### off()

> **off**(...`args`): [`EventEmitter`](/api/auth-foundation)\<`E`\>

alias for `this.emitter.off`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| ...`args` | \[keyof `E`, [`EventListener`](/api/auth-foundation)\<`E`\[keyof `E`\]\>\] |

#### Returns

[`EventEmitter`](/api/auth-foundation)\<`E`\>

#### Inherited from

`TokenOrchestrator.off`

***

### authorize()

> **authorize**(`input`, `init?`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Request`](https://developer.mozilla.org/docs/Web/API/Request)\>

Signs an outgoing [Request](https://developer.mozilla.org/docs/Web/API/Request) with an `Authorization` header via [Token](/api/auth-foundation/Token/) retrieved from [getToken](/api/auth-foundation)

Optionally [AuthorizeParams](/api/auth-foundation) can be provided to be passed along to [getToken](/api/auth-foundation)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | `string` \| [`URL`](https://developer.mozilla.org/docs/Web/API/URL) \| [`Request`](https://developer.mozilla.org/docs/Web/API/Request) |
| `init?` | `RequestInit` & `object` & [`AuthorizeParams`](/api/auth-foundation) |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Request`](https://developer.mozilla.org/docs/Web/API/Request)\>

#### Inherited from

`TokenOrchestrator.authorize`

***

### resumeFlow()

> **resumeFlow**(`redirectUri?`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)\<`string`, `any`\>\>

Defines how to handle the authorization code redirect via
[AuthorizationCodeFlow.resume](/api/auth-foundation)

throws if an OAuth2 error is returned

#### Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `redirectUri` | `string` | `window.location.href` |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)\<`string`, `any`\>\>

***

### selectCredential()

> **selectCredential**(`options`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Credential`](../../Platform/classes/Credential.md) \| `null`\>

Defines how to search storage for an existing token

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`AuthorizeParams`](/api/auth-foundation) |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Credential`](../../Platform/classes/Credential.md) \| `null`\>

***

### getToken()

> **getToken**(`params?`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Token`](/api/auth-foundation/Token/) \| `null`\>

Determines if a valid token already exists in storage, otherwise requests a new token

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `params` | [`AuthorizeParams`](/api/auth-foundation) |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Token`](/api/auth-foundation/Token/) \| `null`\>

#### Overrides

`TokenOrchestrator.getToken`

## Remarks

`AuthorizationCodeFlowOrchestrator` defaults to [PerformRedirect](../../Flows/classes/AuthorizationCodeFlow.md#performredirect). This requires the application
handles the redirect via [AuthorizationCodeFlowOrchestrator.resumeFlow](index.md#resumeflow).

## Interfaces

| Interface | Description |
| ------ | ------ |
| [Events](interfaces/Events.md) | A map of possible events emitted by [AuthorizationCodeFlowOrchestrator.emitter](index.md#emitter) |

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [Options](type-aliases/Options.md) | Options to define behavior of [AuthorizationCodeFlowOrchestrator](index.md). |
