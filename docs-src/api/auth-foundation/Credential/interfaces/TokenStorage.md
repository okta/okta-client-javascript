[@okta/auth-foundation](../..) / [Credential](../index.md) / TokenStorage

# Interface: TokenStorage

Defines interface for token storage. [Token](../../Token/index.md) and [Token.Metadata](../../Token/type-aliases/Metadata.md) are treated as independent entities,
which enables them to be stored in different locations. This may be more relevant in mobile environments, where [Token](../../Token/index.md) data can be
written to a secure location (which requires biometrics to access) and [Token.Metadata](../../Token/type-aliases/Metadata.md), containing only non-sensitive info
can be stored in a more accessible location and used to query which tokens are available (without prompting biometrics)

## Remarks

Default implementation provided is an in-memory solution and is **NOT** intended for production use. The [Platform Libraries](/docs/structure#tier-3) include
TokenStorage implementations, which are production-ready, relevant to their specific platform.

## Properties

### emitter

> `readonly` **emitter**: [`EventEmitter`](../../Core/classes/EventEmitter.md)\<[`TokenStorageEvents`](TokenStorageEvents.md)\>

***

### defaultTokenId

> `readonly` **defaultTokenId**: `string` \| `null` \| `undefined`

In memory cached value of the [default Credential](../classes/Credential.md#getdefault)'s id

## Methods

### loadDefaultTokenId()

> **loadDefaultTokenId**(): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`string` \| `null`\>

Queries storage location for  stored id

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`string` \| `null`\>

***

### setDefaultTokenId()

> **setDefaultTokenId**(`id`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>

Updates the stored [default Credential](../classes/Credential.md#getdefault) id

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `id` | `string` \| `null` |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>

***

### allIDs()

> **allIDs**(): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`string`[]\>

Returns all token [ids](../../Token/index.md#id) in storage

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`string`[]\>

***

### add()

> **add**(`token`, `metadata?`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>

Writes a [Token](../../Token/index.md) to storage

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `token` | [`Token`](../../Token/index.md) | raw JSON representation of [Token](../../Token/index.md) |
| `metadata?` | [`Metadata`](../../Token/type-aliases/Metadata.md) | non-sensitive data regarding the stored [Token](../../Token/index.md) which will be used in storage queries |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>

***

### replace()

> **replace**(`id`, `token`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>

Updates the [Token](../../Token/index.md) value in storage for a given [id](../../Token/index.md#id).
Used by operations like [Credential.refresh](../classes/Credential.md#refresh)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `id` | `string` |
| `token` | [`Token`](../../Token/index.md) |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>

***

### remove()

> **remove**(`id`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>

Removes the [Token](../../Token/index.md) value for a given [id](../../Token/index.md#id) from storage

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `id` | `string` |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>

#### Remarks

**NOTE:** This does *not* [revoke](../classes/Credential.md#revoke) tokens. They are only removed from storage!

***

### get()

> **get**(`id`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Token`](../../Token/index.md) \| `null`\>

Retrieves a [Token](../../Token/index.md) from storage

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `id` | `string` |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Token`](../../Token/index.md) \| `null`\>

#### Remarks

This may prompt user for biometrics in certain mobile environments

***

### getMetadata()

> **getMetadata**(`id`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Metadata`](../../Token/type-aliases/Metadata.md) \| `null`\>

Retieves [Token.Metadata](../../Token/type-aliases/Metadata.md) for a given [id](../../Token/index.md#id)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `id` | `string` |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Metadata`](../../Token/type-aliases/Metadata.md) \| `null`\>

#### Remarks

[Token.Metadata](../../Token/type-aliases/Metadata.md) will be written to less-protected location and therefore will not prompt biometrics

***

### setMetadata()

> **setMetadata**(`metadata`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>

Writes [Token.Metadata](../../Token/type-aliases/Metadata.md) for a given [Token](../../Token/index.md) to storage

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `metadata` | [`Metadata`](../../Token/type-aliases/Metadata.md) |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>

***

### clear()

> **clear**(): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>

Clears all [Token](../../Token/index.md) instances from storage

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>

#### Remarks

**NOTE:** This does *not* [revoke](../classes/Credential.md#revoke) tokens. They are only removed from storage!
