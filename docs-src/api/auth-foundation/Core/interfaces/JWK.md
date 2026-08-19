[@okta/auth-foundation](../..) / [Core](../index.md) / JWK

# Interface: JWK

Defines properties of a JSON Web Key

## Remarks

Currently only `RSA`/`RS256` are supported.

## See

* [RFC 7517 - JSON Web Key (JWK) Format](https://datatracker.ietf.org/doc/html/rfc7517#section-4)

## Extends

- `JsonWebKey`

## Properties

### kty

> **kty**: `"RSA"`

Key Type

#### See

[RFC 7517 - "kty" (Key Type) Parameter](https://datatracker.ietf.org/doc/html/rfc7517#section-4.1)

#### Overrides

`JsonWebKey.kty`

***

### alg

> **alg**: `"RS256"`

Algorithm

#### See

[RFC 7517 - "alg" (Algorithm) Parameter](https://datatracker.ietf.org/doc/html/rfc7517#section-4.4)

#### Overrides

`JsonWebKey.alg`

***

### kid

> **kid**: `string`

Key ID

#### See

[RFC 7517 - "kid" (Key ID) Parameter](https://datatracker.ietf.org/doc/html/rfc7517#section-4.5)

***

### use?

> `optional` **use?**: `string`

"Use" (public key use)

#### Remarks

According to RFC 7517, `sig` and `enc` are defined, but any value may be used.

#### See

[RFC 7517 - "use" (Public Key Use) Parameter](https://datatracker.ietf.org/doc/html/rfc7517#section-4.2)

#### Overrides

`JsonWebKey.use`

***

### crv?

> `optional` **crv?**: `string`

#### Inherited from

`JsonWebKey.crv`

***

### d?

> `optional` **d?**: `string`

#### Inherited from

`JsonWebKey.d`

***

### dp?

> `optional` **dp?**: `string`

#### Inherited from

`JsonWebKey.dp`

***

### dq?

> `optional` **dq?**: `string`

#### Inherited from

`JsonWebKey.dq`

***

### e?

> `optional` **e?**: `string`

#### Inherited from

`JsonWebKey.e`

***

### ext?

> `optional` **ext?**: `boolean`

#### Inherited from

`JsonWebKey.ext`

***

### k?

> `optional` **k?**: `string`

#### Inherited from

`JsonWebKey.k`

***

### key\_ops?

> `optional` **key\_ops?**: `string`[]

#### Inherited from

`JsonWebKey.key_ops`

***

### n?

> `optional` **n?**: `string`

#### Inherited from

`JsonWebKey.n`

***

### oth?

> `optional` **oth?**: `RsaOtherPrimesInfo`[]

#### Inherited from

`JsonWebKey.oth`

***

### p?

> `optional` **p?**: `string`

#### Inherited from

`JsonWebKey.p`

***

### q?

> `optional` **q?**: `string`

#### Inherited from

`JsonWebKey.q`

***

### qi?

> `optional` **qi?**: `string`

#### Inherited from

`JsonWebKey.qi`

***

### x?

> `optional` **x?**: `string`

#### Inherited from

`JsonWebKey.x`

***

### y?

> `optional` **y?**: `string`

#### Inherited from

`JsonWebKey.y`
