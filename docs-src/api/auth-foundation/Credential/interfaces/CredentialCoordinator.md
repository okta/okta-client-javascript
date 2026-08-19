[@okta/auth-foundation](../..) / [Credential](../index.md) / CredentialCoordinator

# Interface: CredentialCoordinator

Holds the implementation of most [Credential](../classes/Credential.md) methods. Bridges the
[CredentialDataSource](CredentialDataSource.md) and [TokenStorage](TokenStorage.md) layers together

## Remarks

Default implementation provided

## Properties

### emitter

> **emitter**: [`EventEmitter`](../../Core/classes/EventEmitter.md)\<[`CredentialCoordinatorEvents`](../type-aliases/CredentialCoordinatorEvents.md)\>

***

### tokenStorage

> **tokenStorage**: [`TokenStorage`](TokenStorage.md)

***

### size

> `readonly` **size**: `number`

Returns the number of recorded [Credential](../classes/Credential.md) instances in the [CredentialDataSource](CredentialDataSource.md)

## Methods

### getDefault()

> **getDefault**(): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Credential`](../classes/Credential.md) \| `null`\>

Represents [Credential.getDefault](../classes/Credential.md#getdefault), backed by [TokenStorage](#tokenstorage)

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Credential`](../classes/Credential.md) \| `null`\>

***

### setDefault()

> **setDefault**(`cred`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `cred` | [`Credential`](../classes/Credential.md) \| `null` |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>

***

### store()

> **store**(`token`, `tags`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Credential`](../classes/Credential.md)\>

Writes the provided [Token](../../Token/index.md) (and [Token.Metadata](../../Token/type-aliases/Metadata.md)) to storage and creates a [Credential](../classes/Credential.md)
instance to represent the [Token](../../Token/index.md) via the [CredentialDataSource](CredentialDataSource.md)

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `token` | [`Token`](../../Token/index.md) | the [Token](../../Token/index.md) to store |
| `tags` | `string`[] | an array of developer-provided tags to associate with a [Token](../../Token/index.md). Used by [Credential.find](../classes/Credential.md#find) queries |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Credential`](../classes/Credential.md)\>

***

### with()

> **with**(`id`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Credential`](../classes/Credential.md) \| `null`\>

Retrieves a [Credential](../classes/Credential.md) for the provided `id` from storage

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `id` | `string` |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Credential`](../classes/Credential.md) \| `null`\>

***

### find()

> **find**(`matcher`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Credential`](../classes/Credential.md)[]\>

Uses stored [Token.Metadata](../../Token/type-aliases/Metadata.md) to match stored [Tokens](../../Token/index.md) by certain criteria

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `matcher` | (`meta`) => `boolean` |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Credential`](../classes/Credential.md)[]\>

***

### remove()

> **remove**(`cred`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>

Removes the provided [Credential](../classes/Credential.md) from storage and [CredentialDataSource](CredentialDataSource.md)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `cred` | [`Credential`](../classes/Credential.md) |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>

#### Remarks

**NOTE:** This does *not* [revoke](../classes/Credential.md#revoke) tokens!

***

### clear()

> **clear**(): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>

Clears both [TokenStorage](TokenStorage.md) and [CredentialDataSource](CredentialDataSource.md)

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>

#### Remarks

**NOTE:** This does *not* [revoke](../classes/Credential.md#revoke) tokens!

***

### allIDs()

> **allIDs**(): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`string`[]\>

Returns all token [ids](../../Token/index.md#id) in storage

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`string`[]\>
