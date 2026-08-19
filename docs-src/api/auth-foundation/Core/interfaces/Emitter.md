[@okta/auth-foundation](../..) / [Core](../index.md) / Emitter

# Interface: Emitter\<E\>

Subscription-only view of an [EventEmitter](../classes/EventEmitter.md), exposing just `on`/`off`.
Useful for handing consumers a way to listen for events without also
granting them the ability to `emit` or `relay` events.

## Type Parameters

| Type Parameter | Description |
| ------ | ------ |
| `E` *extends* `object` | A map of possible events where the `key` is the event name and the `value` is the event payload structure |

## Properties

### on

> **on**: (...`args`) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| ...`args` | \[keyof `E`, [`EventListener`](../type-aliases/EventListener.md)\<`E`\[keyof `E`\]\>\] |

#### Returns

`void`

***

### off

> **off**: (...`args`) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| ...`args` | \[keyof `E`, [`EventListener`](../type-aliases/EventListener.md)\<`E`\[keyof `E`\]\>\] |

#### Returns

`void`
