[@okta/auth-foundation](../..) / [OAuth2](../index.md) / DPoPNonceCache

# Interface: DPoPNonceCache

> The intent is that clients need to keep only one nonce value and 
servers need to keep a window of recent nonces.

via https://datatracker.ietf.org/doc/html/rfc9449#section-8

Authorization servers may provide the same `dpop-nonce` value for a window of time.
The `DPoPNonceCache` serves as a cache of these nonce values to avoid unnecessary
failures. [DPoPSigningAuthority.sign](DPoPSigningAuthority.md#sign) will 
use nonce values from the cache when available.

## Remarks

A `DPoPNonceCache` instance will be create for each [APIClient](../../Networking/APIClient/index.md) instance,
but `DPoPNonceCache` implementations will often share a common store

## See

* [RFC 9449 - DPoP Nonce Downgrade](https://datatracker.ietf.org/doc/html/rfc9449#section-11.3)
* [RFC 9449 - Authorization Server-Provided Nonce](https://datatracker.ietf.org/doc/html/rfc9449#section-8)
* [RFC 9449 - Resource Server-Provided Nonce](https://datatracker.ietf.org/doc/html/rfc9449#section-9)

## Methods

### getNonce()

> **getNonce**(`key`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`string` \| `undefined`\>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `key` | `string` |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`string` \| `undefined`\>

***

### cacheNonce()

> **cacheNonce**(`key`, `nonce`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `key` | `string` |
| `nonce` | `string` |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>

***

### clear()

> **clear**(): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>
