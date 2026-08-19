[@okta/auth-foundation](../..) / [Core](../index.md) / JWTPayload

# Interface: JWTPayload

**`Use Declared Type`**

Defines registered `JWT` claim names.

## See

* [RFC 7519 - Registered Claim Names](https://datatracker.ietf.org/doc/html/rfc7519#section-4)

## Indexable

> \[`key`: `string`\]: [`JsonPrimitive`](../type-aliases/JsonPrimitive.md) \| [`Json`](../type-aliases/Json.md) \| `undefined`

## Properties

### aud?

> `optional` **aud?**: `string`

Audience

#### See

[RFC 7519 - "aud" (Audience) Claim](https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.3)

***

### iss?

> `optional` **iss?**: `string`

Issuer

#### See

[RFC 7519 - "iss" (Issuer) Claim](https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.1)

***

### sub?

> `optional` **sub?**: `string`

Subject

#### See

[RFC 7519 - "sub" (Subject) Claim](https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.2)

***

### exp?

> `optional` **exp?**: `number`

Expiration Time

#### See

[RFC 7519 - "exp" (Expiration Time) Claim](https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.4)

***

### iat?

> `optional` **iat?**: `number`

Issued At

#### See

[RFC 7519 - "iat" (Issued At) Claim](https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.6)

***

### nbf?

> `optional` **nbf?**: `number`

Not Before

#### See

[RFC 7519 - "nbf" (Not Before) Claim](https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.5)

***

### jti?

> `optional` **jti?**: `string`

JWT ID

#### See

[RFC 7519 - "jti" (JWT ID) Claim](https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.7)

***

### scp?

> `optional` **scp?**: `string`[]

Scopes

#### See

[RFC 8693 - "scope" (Scopes) Claim](https://datatracker.ietf.org/doc/html/rfc8693#section-4.2)

***

### acr?

> `optional` **acr?**: `string`

Authentication Context Class Reference

#### See

[OIDC Core - ID Token](https://openid.net/specs/openid-connect-core-1_0.html#IDToken)

***

### at\_hash?

> `optional` **at\_hash?**: `string`

Access Token hash value

#### See

[OIDC Core - "at\_hash" Claim](https://openid.net/specs/openid-connect-core-1_0.html#CodeIDToken)
