[@okta/auth-foundation](../..) / [Credential](../index.md) / CredentialDataSource

# Interface: CredentialDataSource

Prevents multiple instances of [Credential](../classes/Credential.md) from existing for the same [Token](../../Token/index.md)

## Remarks

Default implementation provided

## Properties

### emitter

> `readonly` **emitter**: [`EventEmitter`](../../Core/classes/EventEmitter.md)\<[`CredentialDataSourceEvents`](../type-aliases/CredentialDataSourceEvents.md)\>

***

### size

> `readonly` **size**: `number`

Returns the number of [Credential](../classes/Credential.md)s recorded in the CredentialDataSource

## Methods

### hasCredential()

> **hasCredential**(`token`): `boolean`

Checks CredentialDataSource for an existing [Credential](../classes/Credential.md) instance which
represents the provided [Token](../../Token/index.md).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `token` | [`Token`](../../Token/index.md) |

#### Returns

`boolean`

***

### credentialFor()

> **credentialFor**(`token`, `metadata?`): [`Credential`](../classes/Credential.md)

Checks CredentialDataSource for an existing [Credential](../classes/Credential.md) instance which
represents the provided [Token](../../Token/index.md). If one does not exist, a new [Credential](../classes/Credential.md)
instance is created (and recorded within the CredentialDataSource)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `token` | [`Token`](../../Token/index.md) |
| `metadata?` | [`Metadata`](../../Token/type-aliases/Metadata.md) |

#### Returns

[`Credential`](../classes/Credential.md)

***

### remove()

> **remove**(`cred`): `void`

Removes provided [Credential](../classes/Credential.md) instance from the CredentialDataSource

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `cred` | `string` \| [`Credential`](../classes/Credential.md) |

#### Returns

`void`

#### Remarks

**NOTE:** This does *not* [revoke](../classes/Credential.md#revoke) the represented token.
They are only removed from the CredentialDataSource!

***

### clear()

> **clear**(): `void`

Clears all [Credential](../classes/Credential.md) instances from the CredentialDataSource

#### Returns

`void`

#### Remarks

**NOTE:** This does *not* [revoke](../classes/Credential.md#revoke) tokens.
They are only removed from the CredentialDataSource!
