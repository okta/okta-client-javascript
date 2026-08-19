[@okta/auth-foundation](../..) / [FetchClient](../index.md) / FetchClient

# Class: FetchClient\<E\>

Wrapper around [fetch](https://developer.mozilla.org/docs/Web/API/Window/fetch) to perform authenticated requests to a resource server. The provided [TokenOrchestrator](../../TokenOrchestrator/index.md)
is used to source [Token](../../Token/index.md)s to sign the outgoing requests.

Out-of-the-box Features:
* `Bearer` and `DPoP` authentication
* Step-up authentication retry
* Automatic `401` and `429` retry

## Extends

- [`APIClient`](../../Networking/APIClient/index.md)\<`E`\>

## Type Parameters

| Type Parameter | Default type | Description |
| ------ | ------ | ------ |
| `E` *extends* [`Events`](../../Networking/APIClient/interfaces/Events.md) | [`Events`](../../Networking/APIClient/interfaces/Events.md) | Map of all events fired from `FetchClient.emitter` |

## Constructors

### Constructor

> **new FetchClient**\<`E`\>(`orchestrator`, ...`__namedParameters`): `FetchClient`\<`E`\>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `orchestrator` | [`TokenOrchestrator`](../../TokenOrchestrator/index.md) |
| ...`__namedParameters` | \[[`Configuration`](../../Networking/APIClient/classes/Configuration.md) \| [`ConfigurationParams`](../../Networking/APIClient/type-aliases/ConfigurationParams.md)\] |

#### Returns

`FetchClient`\<`E`\>

#### Overrides

[`APIClient`](../../Networking/APIClient/index.md).[`constructor`](../../Networking/APIClient/index.md#constructor)

## Properties

### defaultRequestOptions

> **defaultRequestOptions**: [`RequestOptions`](../../Networking/APIClient/type-aliases/RequestOptions.md)

Default options provided to each request

#### Overrides

[`APIClient`](../../Networking/APIClient/index.md).[`defaultRequestOptions`](../../Networking/APIClient/index.md#defaultrequestoptions)

## Methods

### fetch()

> **fetch**(`input`, `init?`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Response`](https://developer.mozilla.org/docs/Web/API/Response)\>

Delegates request signing to [TokenOrchestrator.authorize](../../TokenOrchestrator/index.md#authorize), then sends requests via the [fetch](https://developer.mozilla.org/docs/Web/API/Window/fetch) provided.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | `string` \| [`URL`](https://developer.mozilla.org/docs/Web/API/URL) \| [`Request`](https://developer.mozilla.org/docs/Web/API/Request) |
| `init` | [`AuthorizeParams`](../../TokenOrchestrator/type-aliases/AuthorizeParams.md) & `RequestInit` & [`Partial`](https://www.typescriptlang.org/docs/handbook/utility-types.html#partialtype)\<[`RequestOptions`](../../Networking/APIClient/type-aliases/RequestOptions.md)\> |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Response`](https://developer.mozilla.org/docs/Web/API/Response)\>

#### Overrides

[`APIClient`](../../Networking/APIClient/index.md).[`fetch`](../../Networking/APIClient/index.md#fetch)
