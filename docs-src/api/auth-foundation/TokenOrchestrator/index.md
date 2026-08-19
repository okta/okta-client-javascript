[@okta/auth-foundation](..) / TokenOrchestrator

# Abstract Class: TokenOrchestrator\<E\>

An abstraction layer between [Token](../Token/index.md) consumers and an application's internal management of [Token](../Token/index.md)s.
Implementations of TokenOrchestrator handle fetching, refreshing, and storing tokens. There is an expectation
(but not enforced by code) that tokens provided by TokenOrchestrator methods are valid (not expired).

Consumers simply call [TokenOrchestrator.getToken](#gettoken) (or [TokenOrchestrator.authorize](#authorize)) to use tokens as needed.

## Remarks

// TODO
Each [Platform Library](/docs/structure#tier-3) offers TokenOrchestrator implementations relevant to the corresponding platform.

## See

* Orchestrator Consumer Example: [FetchClient](../FetchClient/index.md)

## Type Parameters

| Type Parameter | Default type | Description |
| ------ | ------ | ------ |
| `E` *extends* [`Events`](interfaces/Events.md) | [`Events`](interfaces/Events.md) | Map of all events fired from [TokenOrchestrator.emitter](#emitter) |

## Implements

- [`RequestAuthorizer`](../Core/interfaces/RequestAuthorizer.md)

## Constructors

### Constructor

> **new TokenOrchestrator**\<`E`\>(): `TokenOrchestrator`\<`E`\>

#### Returns

`TokenOrchestrator`\<`E`\>

## Properties

### emitter

> `protected` `readonly` **emitter**: [`EventEmitter`](../Core/classes/EventEmitter.md)\<`E`\>

Possible events: [TokenOrchestrator.Events](interfaces/Events.md)

#### Example

To add a new event within a derived class, first extend [TokenOrchestrator.Events](interfaces/Events.md), like so:
```ts
type MyOrchestratorEvents = { 'no_token': { params: any } } & TokenOrchestrator.Events;

class MyTokenOrchestrator<E extends MyOrchestratorEvents = MyOrchestratorEvents> extends TokenOrchestrator<E> {
  protected async getToken (params: TokenOrchestrator.AuthorizeParams): Promise<Token | null> {
    const token = this.findTokenInStorage(params);     // example method
    if (token === null) {
      // this `.emit` call will be properly typed
      this.emitter.emit('no_token', params);
    }
    return token;
  }
}
```

## Methods

### on()

> **on**(...`args`): [`EventEmitter`](../Core/classes/EventEmitter.md)\<`E`\>

alias for `this.emitter.on`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| ...`args` | \[keyof `E`, [`EventListener`](../Core/type-aliases/EventListener.md)\<`E`\[keyof `E`\]\>\] |

#### Returns

[`EventEmitter`](../Core/classes/EventEmitter.md)\<`E`\>

***

### off()

> **off**(...`args`): [`EventEmitter`](../Core/classes/EventEmitter.md)\<`E`\>

alias for `this.emitter.off`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| ...`args` | \[keyof `E`, [`EventListener`](../Core/type-aliases/EventListener.md)\<`E`\[keyof `E`\]\>\] |

#### Returns

[`EventEmitter`](../Core/classes/EventEmitter.md)\<`E`\>

***

### getToken()

> `abstract` **getToken**(`params`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Token`](../Token/index.md) \| `null`\>

Retrieves a valid [Token](../Token/index.md) to be used within an application

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `params` | [`AuthorizeParams`](type-aliases/AuthorizeParams.md) |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Token`](../Token/index.md) \| `null`\>

***

### authorize()

> **authorize**(`input`, `init?`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Request`](https://developer.mozilla.org/docs/Web/API/Request)\>

Signs an outgoing [Request](https://developer.mozilla.org/docs/Web/API/Request) with an `Authorization` header via [Token](../Token/index.md) retrieved from [getToken](#gettoken)

Optionally [AuthorizeParams](type-aliases/AuthorizeParams.md) can be provided to be passed along to [getToken](#gettoken)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | `string` \| [`URL`](https://developer.mozilla.org/docs/Web/API/URL) \| [`Request`](https://developer.mozilla.org/docs/Web/API/Request) |
| `init` | `RequestInit` & `object` & [`AuthorizeParams`](type-aliases/AuthorizeParams.md) |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Request`](https://developer.mozilla.org/docs/Web/API/Request)\>

#### Implementation of

[`RequestAuthorizer`](../Core/interfaces/RequestAuthorizer.md).[`authorize`](../Core/interfaces/RequestAuthorizer.md#authorize)

## Functions

| Function | Description |
| ------ | ------ |
| [extractAuthParams](functions/extractAuthParams.md) | Utility function to separate [AuthorizeParams](type-aliases/AuthorizeParams.md) from other options. Intended to help separate params from intersected types in method signatures |

## Interfaces

| Interface | Description |
| ------ | ------ |
| [Events](interfaces/Events.md) | Map of events fired from [TokenOrchestrator.emitter](index.md#emitter) |

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [AuthorizeParams](type-aliases/AuthorizeParams.md) | Parameters used to make OAuth2 token requests |
