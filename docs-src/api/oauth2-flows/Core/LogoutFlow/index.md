[@okta/oauth2-flows](../..) / [Core](../index-1.md) / LogoutFlow

# Abstract Class: LogoutFlow

Base class shared by all logout flows in this package (e.g. [SessionLogoutFlow](../../SessionLogoutFlow/index.md))

## Extends

- [`AuthenticationFlow`](../AuthenticationFlow/index.md)

## Extended by

- [`SessionLogoutFlow`](../../SessionLogoutFlow/index.md)

## Constructors

### Constructor

> **new LogoutFlow**(): `LogoutFlow`

#### Returns

`LogoutFlow`

#### Inherited from

[`AuthenticationFlow`](../AuthenticationFlow/index.md).[`constructor`](../AuthenticationFlow/index.md#constructor)

## Properties

### emitter

> `protected` `readonly` **emitter**: [`EventEmitter`](/api/auth-foundation)\<[`AuthenticationFlowEvents`](../type-aliases/AuthenticationFlowEvents.md)\>

Possible events: [AuthenticationFlowEvents](../type-aliases/AuthenticationFlowEvents.md)

#### Inherited from

[`AuthenticationFlow`](../AuthenticationFlow/index.md).[`emitter`](../AuthenticationFlow/index.md#emitter)

## Accessors

### inProgress

#### Get Signature

> **get** **inProgress**(): `boolean`

Whether this flow is currently in progress. Setting this value emits
[flow\_started](../type-aliases/AuthenticationFlowEvents.md#property-flow_started) or
[flow\_stopped](../type-aliases/AuthenticationFlowEvents.md#property-flow_stopped)

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

[`AuthenticationFlow`](../AuthenticationFlow/index.md).[`inProgress`](../AuthenticationFlow/index.md#inprogress)

## Methods

### on()

> **on**(...`args`): `void`

Alias for `emitter.on`.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| ...`args` | \[keyof [`AuthenticationFlowEvents`](../type-aliases/AuthenticationFlowEvents.md), (() => `void`) \| ((`event`) => `void`)\] |

#### Returns

`void`

#### See

[EventEmitter.on](/api/auth-foundation/Core/classes/EventEmitter/#on)

#### Inherited from

[`AuthenticationFlow`](../AuthenticationFlow/index.md).[`on`](../AuthenticationFlow/index.md#on)

***

### off()

> **off**(...`args`): `void`

Alias for `emitter.off`.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| ...`args` | \[keyof [`AuthenticationFlowEvents`](../type-aliases/AuthenticationFlowEvents.md), (() => `void`) \| ((`event`) => `void`)\] |

#### Returns

`void`

#### See

[EventEmitter.off](/api/auth-foundation/Core/classes/EventEmitter/#off)

#### Inherited from

[`AuthenticationFlow`](../AuthenticationFlow/index.md).[`off`](../AuthenticationFlow/index.md#off)

***

### reset()

> **reset**(): `void`

Resets the flow, marking it as no longer [AuthenticationFlow.inProgress](../AuthenticationFlow/index.md#inprogress).
Subclasses should override this to additionally clear any in-progress flow state,
calling `super.reset()` to also reset [AuthenticationFlow.inProgress](../AuthenticationFlow/index.md#inprogress)

#### Returns

`void`

#### Inherited from

[`AuthenticationFlow`](../AuthenticationFlow/index.md).[`reset`](../AuthenticationFlow/index.md#reset)

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [Options](type-aliases/Options.md) | Options common to every [AuthenticationFlow](../AuthenticationFlow/index.md) implementation |
