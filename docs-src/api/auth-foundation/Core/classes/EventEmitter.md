[@okta/auth-foundation](../..) / [Core](../index.md) / EventEmitter

# Class: EventEmitter\<Events\>

An object that implements the publish-subscribe pattern, allowing different parts of an 
application to communicate asynchronously through events

## Type Parameters

| Type Parameter | Description |
| ------ | ------ |
| `Events` *extends* `object` | A map of possible events where the `key` is the event name and the `value` is the event payload structure |

## Constructors

### Constructor

> **new EventEmitter**\<`Events`\>(): `EventEmitter`\<`Events`\>

#### Returns

`EventEmitter`\<`Events`\>

## Methods

### on()

> **on**\<`K`\>(`eventName`, `handler`): `this`

Binds a listener function to a specific event

#### Type Parameters

| Type Parameter | Description |
| ------ | ------ |
| `K` *extends* `string` \| `number` \| `symbol` | The event name (also the key within `Events`) |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `eventName` | `K` |
| `handler` | [`EventListener`](../type-aliases/EventListener.md)\<`Events`\[`K`\]\> |

#### Returns

`this`

***

### off()

> **off**\<`K`\>(`eventName`, `handler?`): `this`

When a `handler` is provided, it is removed as a listener to the specified event `eventName`.

When no `handler` is provided, all listeners for the specified event are removed.

#### Type Parameters

| Type Parameter | Description |
| ------ | ------ |
| `K` *extends* `string` \| `number` \| `symbol` | The event name (also the key within `Events`) |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `eventName` | `K` |
| `handler?` | [`EventListener`](../type-aliases/EventListener.md)\<`Events`\[`K`\]\> |

#### Returns

`this`

#### Remarks

This method will no-op if the `function` provided as `handler` is not a registered listener
to the provided `eventName`

***

### emit()

#### Call Signature

> **emit**\<`K`\>(`eventName`, `data`): `void`

Synchronously calls each of the listeners registered for the event named `eventName`, 
in the order they were registered, passing the supplied `data` to each.

##### Type Parameters

| Type Parameter | Description |
| ------ | ------ |
| `K` *extends* `string` \| `number` \| `symbol` | The event name (also the key within `Events`) |

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `eventName` | `K` |
| `data` | `Events`\[`K`\] |

##### Returns

`void`

##### Remarks

`data` will be type checked to match the `Events` map. A `TS` error will occur if the
`object` provided as `data` does not match the type defined at `Events[K]`.

#### Call Signature

> **emit**\<`K`\>(`eventName`): `void`

Synchronously calls each of the listeners registered for the event named `eventName`, 
in the order they were registered, passing the supplied `data` to each.

##### Type Parameters

| Type Parameter | Description |
| ------ | ------ |
| `K` *extends* `string` \| `number` \| `symbol` | The event name (also the key within `Events`) |

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `eventName` | `K` |

##### Returns

`void`

##### Remarks

`data` will be type checked to match the `Events` map. A `TS` error will occur if the
`object` provided as `data` does not match the type defined at `Events[K]`.

***

### relay()

> **relay**\<`FromEvents`, `K`\>(`emitter`, `events`): `void`

Relays the specified events in `events` from `emitter` (or "relay-ee"). The "relay-er" (`this`) will relay all
events emitted from the "relay-ee"

#### Type Parameters

| Type Parameter | Default type | Description |
| ------ | ------ | ------ |
| `FromEvents` *extends* `object` | - | The `Events` map from the "relay-ee" `emitter`. This type param will be inferred and does not need to be explicitly provided. |
| `K` *extends* `string` \| `number` \| `symbol` | keyof `Events` & keyof `FromEvents` | The event name (also the key within `Events` OR `FromEvents`) |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `emitter` | `EventEmitter`\<`FromEvents`\> |
| `events` | `K`[] |

#### Returns

`void`

#### Remarks

The possibility of both emitters `Events` maps containing the same `key` (event name) has not been tested.

#### Example

```ts
type WeekdayEvents = { "work": { foo: number } };
type WeekendEvents = { "play": { bar: string } };

const weekday = new EventEmitter<WeekdayEvents>();
const weekend = new EventEmitter<WeekendEvents>();

// for the types to work properly, the `Events` map of the relaying `EventEmitter`
// must contain all events which will be relayed
const daily = new EventEmitter<WeekdayEvents & WeekendEvents>();
daily.relay(weekday, ['work']);
daily.relay(weekend, ['play']);

daily.on('play', (({ bar }) => { console.log(`yay fun ${bar}!`) });
daily.on('work', (({ foo }) => { console.log(`boooo ${foo}!`) });

weekday.emit('work', { foo: 1 });    // will fire `daily.on('work', ...)`;
```
