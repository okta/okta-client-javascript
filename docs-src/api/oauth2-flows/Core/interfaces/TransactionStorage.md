[@okta/oauth2-flows](../..) / [Core](../index.md) / TransactionStorage

# Interface: TransactionStorage

Persists contextual data across the redirect to and
from an Authorization Server, keyed by the transaction's `state` value

## Methods

### get()

> **get**(`key`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`JsonRecord`](/api/auth-foundation) \| `undefined`\>

Retrieves the stored context for `key`, or `undefined` if none exists

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `key` | `string` |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`JsonRecord`](/api/auth-foundation) \| `undefined`\>

***

### add()

> **add**(`key`, `item`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>

Stores `item` under `key`, overwriting any existing entry

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `key` | `string` |
| `item` | [`JsonRecord`](/api/auth-foundation) |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>

***

### remove()

> **remove**(`key`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>

Removes the entry stored under `key`, if any

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `key` | `string` |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>
