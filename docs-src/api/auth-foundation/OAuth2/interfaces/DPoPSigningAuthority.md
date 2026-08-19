[@okta/auth-foundation](../..) / [OAuth2](../index.md) / DPoPSigningAuthority

# Interface: DPoPSigningAuthority

A Platform-level singleton for performing `DPoP` operations. The DPoPSigningAuthority is
reasonable for mangaging `DPoP` key pairs and generate `DPoP` proofs for outgoing [Request](https://developer.mozilla.org/docs/Web/API/Request)s

## Properties

### createDPoPKeyPair

> **createDPoPKeyPair**: () => [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`string`\>

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`string`\>

***

### deleteDPoPKeyPair

> **deleteDPoPKeyPair**: (`keyPairId`) => [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `keyPairId` | `string` |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>

***

### clearDPoPKeyPairs

> **clearDPoPKeyPairs**: () => [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>

***

### sign

> **sign**: (`request`, `params`) => [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Request`](https://developer.mozilla.org/docs/Web/API/Request)\>

Generates a `DPoP` proof for the provided [Request](https://developer.mozilla.org/docs/Web/API/Request) and writes the `dpop` request header.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `request` | [`Request`](https://developer.mozilla.org/docs/Web/API/Request) |
| `params` | [`Omit`](https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys)\<[`DPoPProofParams`](DPoPProofParams.md), `"request"`\> |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Request`](https://developer.mozilla.org/docs/Web/API/Request)\>

#### See

[RFC 9449 - DPoP Proof JWTs](https://datatracker.ietf.org/doc/html/rfc9449#section-4)
