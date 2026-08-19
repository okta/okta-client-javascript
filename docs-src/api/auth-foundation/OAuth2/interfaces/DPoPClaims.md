[@okta/auth-foundation](../..) / [OAuth2](../index.md) / DPoPClaims

# Interface: DPoPClaims

`JWT` claims associated with a `DPoP` proof

## See

[RFC 9499 - DPoP Proof Claims](https://datatracker.ietf.org/doc/html/rfc9449#section-4.2-3)

## Extends

- [`JsonRecord`](../../Core/type-aliases/JsonRecord.md)

## Indexable

> \[`key`: `string`\]: [`JsonPrimitive`](../../Core/type-aliases/JsonPrimitive.md) \| [`Json`](../../Core/type-aliases/Json.md) \| `undefined`

## Properties

### htm

> **htm**: `string`

(http) request method (verb)

***

### htu

> **htu**: `string`

(http) request url

***

### iat

> **iat**: `number`

issued at (timestamp)

***

### jti

> **jti**: `string`

unique identifier

***

### nonce?

> `optional` **nonce?**: `string`

nonce value (provided by dpop-nonce header)

***

### ath?

> `optional` **ath?**: `string`

access token hash
