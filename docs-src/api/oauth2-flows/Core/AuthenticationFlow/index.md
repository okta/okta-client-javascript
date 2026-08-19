[@okta/oauth2-flows](../..) / [Core](../index.md) / AuthenticationFlow

# Abstract Class: AuthenticationFlow\<E\>

Base class shared by all OAuth2/OIDC flows in this package (e.g. [AuthorizationCodeFlow](../../AuthorizationCodeFlow/index.md)), 
providing the common bits every flow needs: progress tracking and a shared [event](../type-aliases/AuthenticationFlowEvents.md) surface.

## Remarks

This class is not meant to be used directly by Application Developers; reach for a concrete
flow implementation instead.

## Example

Similar to [APIClient](/api/auth-foundation/Networking/APIClient), to add flow-specific events
```ts
type MyFlowEvents = { 'foo': { bar: number } } & AuthenticationFlowEvents;

class MyFlow<E extends MyFlowEvents = MyFlowEvents> extends AuthenticationFlow<E> {
  public async start (): Promise<Result> {
    this.startFlow();
    const result = await doSomething();

    // this will be properly type checked
    this.emitter('foo', { bar: 1 });
    
    return result;
  }
}
```

## Extended by

- [`AuthorizationCodeFlow`](../../AuthorizationCodeFlow/index.md)
- [`LogoutFlow`](../LogoutFlow/index.md)

## Type Parameters

| Type Parameter | Default type | Description |
| ------ | ------ | ------ |
| `E` *extends* [`AuthenticationFlowEvents`](../type-aliases/AuthenticationFlowEvents.md) | [`AuthenticationFlowEvents`](../type-aliases/AuthenticationFlowEvents.md) | Map of all events fired from this flow. Extend [AuthenticationFlowEvents](../type-aliases/AuthenticationFlowEvents.md) |

## Implements

- [`Emitter`](/api/auth-foundation)\<`E`\>

## Constructors

### Constructor

> **new AuthenticationFlow**\<`E`\>(): `AuthenticationFlow`\<`E`\>

#### Returns

`AuthenticationFlow`\<`E`\>

## Properties

### emitter

> `protected` `readonly` **emitter**: [`EventEmitter`](/api/auth-foundation)\<`E`\>

Possible events: [AuthenticationFlowEvents](../type-aliases/AuthenticationFlowEvents.md)

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

## Methods

### on()

> **on**(...`args`): `void`

Alias for `emitter.on`.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| ...`args` | \[keyof `E`, [`EventListener`](/api/auth-foundation)\<`E`\[keyof `E`\]\>\] |

#### Returns

`void`

#### See

[EventEmitter.on](/api/auth-foundation/Core/classes/EventEmitter/#on)

#### Implementation of

`Emitter.on`

***

### off()

> **off**(...`args`): `void`

Alias for `emitter.off`.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| ...`args` | \[keyof `E`, [`EventListener`](/api/auth-foundation)\<`E`\[keyof `E`\]\>\] |

#### Returns

`void`

#### See

[EventEmitter.off](/api/auth-foundation/Core/classes/EventEmitter/#off)

#### Implementation of

`Emitter.off`

***

### reset()

> **reset**(): `void`

Resets the flow, marking it as no longer [AuthenticationFlow.inProgress](#inprogress).
Subclasses should override this to additionally clear any in-progress flow state,
calling `super.reset()` to also reset [AuthenticationFlow.inProgress](#inprogress)

#### Returns

`void`

## Interfaces

| Interface | Description |
| ------ | ------ |
| [Options](interfaces/Options.md) | Options common to every [AuthenticationFlow](index.md) implementation |
