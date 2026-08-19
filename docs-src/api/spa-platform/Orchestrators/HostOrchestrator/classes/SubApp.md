[@okta/spa-platform](../..) / [Orchestrators](../index.md) / SubAppOrchestrator

# Class: SubAppOrchestrator\<E\>

An implementation of [TokenOrchestrator](/api/auth-foundation/TokenOrchestrator/) which delegates all token retrieval to a centralized broker,
rather than acquiring tokens itself

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `E` *extends* [`SubAppEvents`](../namespaces/HostOrchestrator/type-aliases/SubAppEvents.md) | [`SubAppEvents`](../namespaces/HostOrchestrator/type-aliases/SubAppEvents.md) |

## Constructors

### Constructor

> **new SubAppOrchestrator**\<`E`\>(`name`, `options?`): `SubAppOrchestrator`\<`E`\>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `name` | `string` |
| `options` | [`SubAppOptions`](../namespaces/HostOrchestrator/type-aliases/SubAppOptions.md) |

#### Returns

`SubAppOrchestrator`\<`E`\>

#### Overrides

`TokenOrchestrator<E>.constructor`

## Properties

### id

> `readonly` **id**: `string`

***

### authParams

> `protected` `readonly` **authParams**: [`AuthorizeParams`](/api/auth-foundation)

***

### emitter

> `protected` `readonly` **emitter**: [`EventEmitter`](/api/auth-foundation)\<`E`\>

Possible events: [TokenOrchestrator.Events](/api/auth-foundation)

#### Example

To add a new event within a derived class, first extend [TokenOrchestrator.Events](/api/auth-foundation), like so:
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

#### Overrides

`TokenOrchestrator.emitter`

***

### defaultTimeout

> **defaultTimeout**: `number` = `5000`

***

### name

> `readonly` **name**: `string`

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

### broadcast()

> `protected` **broadcast**\<`K`\>(`eventName`, `data`, `options?`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`ResponseEvent`\[`K`\]\>

#### Type Parameters

| Type Parameter |
| ------ |
| `K` *extends* `"TOKEN"` \| `"AUTHORIZE"` \| `"PROFILE"` \| `"ACTIVATED"` \| `"PING"` |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `eventName` | `K` |
| `data` | `RequestEvent`\[`K`\]\[`"data"`\] |
| `options` | [`SubAppBroadcastOptions`](../type-aliases/SubAppBroadcastOptions.md) |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`ResponseEvent`\[`K`\]\>

***

### getTokenCacheKey()

> `protected` **getTokenCacheKey**(`params`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`string`\>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `params` | [`AuthorizeParams`](/api/auth-foundation) |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`string`\>

***

### ping()

> `protected` **ping**(`timeout`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`boolean`\>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `timeout` | `number` |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`boolean`\>

***

### pingHost()

> **pingHost**(`__namedParameters?`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`boolean`\>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `__namedParameters` | \{ `interval?`: `number`; `attempts?`: `number`; \} |
| `__namedParameters.interval?` | `number` |
| `__namedParameters.attempts?` | `number` |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`boolean`\>

***

### requestToken()

> `protected` **requestToken**(`params`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Token`](/api/auth-foundation/Token/) \| `null`\>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `params` | [`AuthorizeParams`](/api/auth-foundation) |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Token`](/api/auth-foundation/Token/) \| `null`\>

***

### getToken()

> **getToken**(`params?`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Token`](/api/auth-foundation/Token/) \| `null`\>

Retrieves a valid [Token](/api/auth-foundation/Token/) to be used within an application

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `params` | [`AuthorizeParams`](/api/auth-foundation) |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Token`](/api/auth-foundation/Token/) \| `null`\>

#### Overrides

`TokenOrchestrator.getToken`

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

#### Overrides

`TokenOrchestrator.authorize`
