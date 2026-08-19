[@okta/spa-platform](../../../..) / [Orchestrators](../../../index.md) / [HostOrchestrator](../index.md) / ProxyHost

# Class: ProxyHost\<E\>

A utility class to adapt any [TokenOrchestrator](/api/auth-foundation/TokenOrchestrator/) instance into a [HostOrchestrator](../index.md)

## Extends

- `Host`\<`E`\>

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `E` *extends* [`HostEvents`](../type-aliases/HostEvents.md) | [`HostEvents`](../type-aliases/HostEvents.md) |

## Constructors

### Constructor

> **new ProxyHost**\<`E`\>(`name`, `orchestrator`): `ProxyHost`\<`E`\>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `name` | `string` |
| `orchestrator` | [`TokenOrchestrator`](/api/auth-foundation/TokenOrchestrator/)\<[`Events`](/api/auth-foundation)\> |

#### Returns

`ProxyHost`\<`E`\>

#### Overrides

`HostOrchestrator.Host<E>.constructor`

## Properties

### emitter

> `protected` `readonly` **emitter**: [`EventEmitter`](/api/auth-foundation)\<`E`\>

#### Inherited from

`HostOrchestrator.Host.emitter`

***

### id

> **id**: `string`

#### Inherited from

`HostOrchestrator.Host.id`

***

### name

> `protected` `readonly` **name**: `string`

#### Inherited from

`HostOrchestrator.Host.name`

***

### orchestrator

> `protected` `readonly` **orchestrator**: [`TokenOrchestrator`](/api/auth-foundation/TokenOrchestrator/)\<[`Events`](/api/auth-foundation)\>

## Accessors

### isActive

#### Get Signature

> **get** **isActive**(): `boolean`

##### Returns

`boolean`

#### Inherited from

`HostOrchestrator.Host.isActive`

## Methods

### on()

> **on**(...`args`): [`EventEmitter`](/api/auth-foundation)\<`E`\>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| ...`args` | \[keyof `E`, [`EventListener`](/api/auth-foundation)\<`E`\[keyof `E`\]\>\] |

#### Returns

[`EventEmitter`](/api/auth-foundation)\<`E`\>

#### Inherited from

`HostOrchestrator.Host.on`

***

### off()

> **off**(...`args`): [`EventEmitter`](/api/auth-foundation)\<`E`\>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| ...`args` | \[keyof `E`, [`EventListener`](/api/auth-foundation)\<`E`\[keyof `E`\]\>\] |

#### Returns

[`EventEmitter`](/api/auth-foundation)\<`E`\>

#### Inherited from

`HostOrchestrator.Host.off`

***

### shouldActive()

> `protected` **shouldActive**(): `boolean`

#### Returns

`boolean`

#### Inherited from

`HostOrchestrator.Host.shouldActive`

***

### activate()

> **activate**(): `void`

#### Returns

`void`

#### Inherited from

`HostOrchestrator.Host.activate`

***

### close()

> **close**(): `void`

#### Returns

`void`

#### Inherited from

`HostOrchestrator.Host.close`

***

### findToken()

> **findToken**(`params?`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Token`](/api/auth-foundation/Token/) \| `ErrorResponse`\>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `params` | [`AuthorizeParams`](/api/auth-foundation) |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Token`](/api/auth-foundation/Token/) \| `ErrorResponse`\>

#### Overrides

`HostOrchestrator.Host.findToken`
