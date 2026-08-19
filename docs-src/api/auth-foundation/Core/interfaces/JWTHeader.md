[@okta/auth-foundation](../..) / [Core](../index.md) / JWTHeader

# Interface: JWTHeader

**`Use Declared Type`**

Defines registered `JWT` header parameters.

## See

* [RFC 7515 - Registered Header Parameter Names](https://datatracker.ietf.org/doc/html/rfc7515#section-4.1)
* [RFC 7519 - JOSE Header](https://datatracker.ietf.org/doc/html/rfc7519#section-5)

## Properties

### alg

> **alg**: `string`

Algorithm

#### See

[RFC 7515 - "alg" (Algorithm) Header Parameter](https://datatracker.ietf.org/doc/html/rfc7515#section-4.1.1)

***

### kid?

> `optional` **kid?**: `string`

Key ID

#### See

[RFC 7515 - "kid" (Key ID) Header Parameter](https://datatracker.ietf.org/doc/html/rfc7515#section-4.1.4)

***

### typ?

> `optional` **typ?**: `string`

Type

#### See

[RFC 7515 - "typ" (Type) Header Parameter](https://datatracker.ietf.org/doc/html/rfc7515#section-4.1.9)

***

### jku?

> `optional` **jku?**: `string`

JWK Set URL

#### See

[RFC 7515 - "jku" (JWK Set URL) Header Parameter](https://datatracker.ietf.org/doc/html/rfc7515#section-4.1.2)

***

### x5u?

> `optional` **x5u?**: `string`

X.509 URL

#### See

[RFC 7515 - "x5u" (X.509 URL) Header Parameter](https://datatracker.ietf.org/doc/html/rfc7515#section-4.1.5)

***

### x5t?

> `optional` **x5t?**: `string`

X.509 Certificate SHA-1 Thumbprint

#### See

[RFC 7515 - "x5t" (X.509 Certificate SHA-1 Thumbprint) Header Parameter](https://datatracker.ietf.org/doc/html/rfc7515#section-4.1.7)

***

### x5c?

> `optional` **x5c?**: `string`

X.509 Certificate Chain

#### See

[RFC 7515 - "x5c" (X.509 Certificate Chain) Header Parameter](https://datatracker.ietf.org/doc/html/rfc7515#section-4.1.6)
