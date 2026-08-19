[@okta/auth-foundation](../..) / [OAuth2](../index.md) / DPoPStorage

# Interface: DPoPStorage

A simple storage interface for `DPoP` key pairs

## Methods

### add()

> **add**(`id`, `keyPair`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `id` | `string` |
| `keyPair` | `CryptoKeyPair` |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>

***

### get()

> **get**(`id`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`CryptoKeyPair` \| `null`\>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `id` | `string` |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`CryptoKeyPair` \| `null`\>

***

### remove()

> **remove**(`id`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `id` | `string` |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>

***

### clear()

> **clear**(): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>
