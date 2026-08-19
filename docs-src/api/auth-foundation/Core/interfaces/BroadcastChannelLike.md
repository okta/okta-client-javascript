[@okta/auth-foundation](../..) / [Core](../index.md) / BroadcastChannelLike

# Interface: BroadcastChannelLike\<M, E\>

A communication channel which follows a similar API pattern to [BroadcastChannel](https://developer.mozilla.org/docs/Web/API/BroadcastChannel)

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `M` *extends* [`JsonRecord`](../type-aliases/JsonRecord.md) | - |
| `E` | `object` |

## Properties

### name

> **name**: `string`

***

### onmessage

> **onmessage**: ((`message`, `reply?`) => `any`) \| `null`

## Methods

### postMessage()

> **postMessage**(`message`): `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `message` | `M` |

#### Returns

`void`

***

### close()

> **close**(): `void`

#### Returns

`void`
