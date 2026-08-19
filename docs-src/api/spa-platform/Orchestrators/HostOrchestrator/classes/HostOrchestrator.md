[@okta/spa-platform](../..) / [Orchestrators](../index.md) / HostOrchestrator

# Abstract Class: HostOrchestrator\<E\>

Receives and fulfills delegated [Token](/api/auth-foundation/Token/) requests from `HostOrchestrator.SubApp` instances

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `E` *extends* [`HostEvents`](../namespaces/HostOrchestrator/type-aliases/HostEvents.md) | [`HostEvents`](../namespaces/HostOrchestrator/type-aliases/HostEvents.md) |

## Constructors

### Constructor

> **new HostOrchestrator**\<`E`\>(`name`, `options?`): `HostOrchestrator`\<`E`\>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `name` | `string` |
| `options` | [`HostOptions`](../namespaces/HostOrchestrator/type-aliases/HostOptions.md) |

#### Returns

`HostOrchestrator`\<`E`\>

## Properties

### emitter

> `protected` `readonly` **emitter**: [`EventEmitter`](/api/auth-foundation)\<`E`\>

***

### id

> **id**: `string`

***

### name

> `protected` `readonly` **name**: `string`

## Accessors

### isActive

#### Get Signature

> **get** **isActive**(): `boolean`

##### Returns

`boolean`

## Methods

### on()

> **on**(...`args`): [`EventEmitter`](/api/auth-foundation)\<`E`\>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| ...`args` | \[keyof `E`, [`EventListener`](/api/auth-foundation)\<`E`\[keyof `E`\]\>\] |

#### Returns

[`EventEmitter`](/api/auth-foundation)\<`E`\>

#### Implementation of

`Emitter.on`

***

### off()

> **off**(...`args`): [`EventEmitter`](/api/auth-foundation)\<`E`\>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| ...`args` | \[keyof `E`, [`EventListener`](/api/auth-foundation)\<`E`\[keyof `E`\]\>\] |

#### Returns

[`EventEmitter`](/api/auth-foundation)\<`E`\>

#### Implementation of

`Emitter.off`

***

### shouldActive()

> `protected` **shouldActive**(): `boolean`

#### Returns

`boolean`

***

### activate()

> **activate**(): `void`

#### Returns

`void`

***

### close()

> **close**(): `void`

#### Returns

`void`

***

### findToken()

> `abstract` **findToken**(`params`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Token`](/api/auth-foundation/Token/) \| `ErrorResponse` \| `null`\>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `params` | [`AuthorizeParams`](/api/auth-foundation) |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Token`](/api/auth-foundation/Token/) \| `ErrorResponse` \| `null`\>
