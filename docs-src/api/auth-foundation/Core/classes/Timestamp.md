[@okta/auth-foundation](../..) / [Core](../index.md) / Timestamp

# Class: Timestamp

Utility class for parse timestamps and performing time/date calculations

## Constructors

### Constructor

> **new Timestamp**(`ts`): `Timestamp`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `ts` | `number` |

#### Returns

`Timestamp`

## Accessors

### value

#### Get Signature

> **get** **value**(): `number`

##### Returns

`number`

***

### asDate

#### Get Signature

> **get** **asDate**(): [`Date`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Date)

##### Returns

[`Date`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Date)

## Methods

### from()

#### Call Signature

> `static` **from**(`t`): `Timestamp`

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `t` | `Timestamp` |

##### Returns

`Timestamp`

#### Call Signature

> `static` **from**(`t`): `Timestamp`

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `t` | [`Date`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Date) |

##### Returns

`Timestamp`

#### Call Signature

> `static` **from**(`t`): `Timestamp`

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `t` | `number` |

##### Returns

`Timestamp`

#### Call Signature

> `static` **from**(`t`): `Timestamp`

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `t` | `number` \| [`Date`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Date) \| `Timestamp` |

##### Returns

`Timestamp`

***

### isBefore()

#### Call Signature

> **isBefore**(`t`): `boolean`

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `t` | `Timestamp` |

##### Returns

`boolean`

#### Call Signature

> **isBefore**(`t`): `boolean`

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `t` | [`Date`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Date) |

##### Returns

`boolean`

#### Call Signature

> **isBefore**(`t`): `boolean`

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `t` | `number` |

##### Returns

`boolean`

***

### isAfter()

#### Call Signature

> **isAfter**(`t`): `boolean`

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `t` | `Timestamp` |

##### Returns

`boolean`

#### Call Signature

> **isAfter**(`t`): `boolean`

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `t` | [`Date`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Date) |

##### Returns

`boolean`

#### Call Signature

> **isAfter**(`t`): `boolean`

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `t` | `number` |

##### Returns

`boolean`

***

### timeSince()

#### Call Signature

> **timeSince**(`t`): `number`

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `t` | `Timestamp` |

##### Returns

`number`

#### Call Signature

> **timeSince**(`t`): `number`

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `t` | [`Date`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Date) |

##### Returns

`number`

#### Call Signature

> **timeSince**(`t`): `number`

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `t` | `number` |

##### Returns

`number`

***

### timeSinceNow()

> **timeSinceNow**(): `number`

#### Returns

`number`
