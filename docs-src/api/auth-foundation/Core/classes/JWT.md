[@okta/auth-foundation](../..) / [Core](../index.md) / JWT

# Class: JWT

A class representation of a `JWT`

## See

* [RFC 7519 - JSON Web Token (JWT)](https://datatracker.ietf.org/doc/html/rfc7519)
* [RFC 7515 - JSON Web Signature (JWS)](https://datatracker.ietf.org/doc/html/rfc7515)
* [RFC 7517 - JSON Web Key (JWK)](https://datatracker.ietf.org/doc/html/rfc7517)

## Implements

- [`RawRepresentable`](../interfaces/RawRepresentable.md)
- [`Expires`](../interfaces/Expires.md)

## Constructors

### Constructor

> **new JWT**(`jwtStr`): `JWT`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `jwtStr` | `string` |

#### Returns

`JWT`

## Static Methods

### write()

> `static` **write**(`header`, `claims`, `signingKey`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`string`\>

Writes and signs a JWT as a `string`.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `header` | [`JWTHeader`](../interfaces/JWTHeader.md) |
| `claims` | [`JsonRecord`](../type-aliases/JsonRecord.md) |
| `signingKey` | [`CryptoKey`](https://developer.mozilla.org/docs/Web/API/CryptoKey) |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`string`\>

## Accessors

### header

#### Get Signature

> **get** **header**(): [`JWTHeader`](../interfaces/JWTHeader.md)

##### Returns

[`JWTHeader`](../interfaces/JWTHeader.md)

***

### claims

#### Get Signature

> **get** **claims**(): [`JWTPayload`](../interfaces/JWTPayload.md)

##### Returns

[`JWTPayload`](../interfaces/JWTPayload.md)

***

### payload

#### Get Signature

> **get** **payload**(): [`JWTPayload`](../interfaces/JWTPayload.md)

##### Returns

[`JWTPayload`](../interfaces/JWTPayload.md)

***

### rawValue

#### Get Signature

> **get** **rawValue**(): `string`

##### Remarks

`RawRepresentable`

##### Returns

`string`

stringified representation of the JWT

#### Implementation of

[`RawRepresentable`](../interfaces/RawRepresentable.md).[`rawValue`](../interfaces/RawRepresentable.md#rawvalue)

***

### isExpired

#### Get Signature

> **get** **isExpired**(): `boolean`

Compares the current time with the [JWT.expirationTime](#expirationtime).

##### See

[Platform.TimeCoordinator](../../Platform/classes/PlatformRegistry.md#timecoordinator)

##### Returns

`boolean`

#### Implementation of

[`Expires`](../interfaces/Expires.md).[`isExpired`](../interfaces/Expires.md#isexpired)

***

### isValid

#### Get Signature

> **get** **isValid**(): `boolean`

Returns `true`, if the token is not expired, compared to the [JWT.expirationTime](#expirationtime)

##### Returns

`boolean`

#### Implementation of

[`Expires`](../interfaces/Expires.md).[`isValid`](../interfaces/Expires.md#isvalid)

## Methods

### verifySignature()

> **verifySignature**(`keySet`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`boolean`\>

Alias for [JWT.validate](#validate).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `keySet` | [`JWKS`](../type-aliases/JWKS.md) |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`boolean`\>

***

### validate()

> **validate**(`keySet`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`boolean`\>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `keySet` | [`JWKS`](../type-aliases/JWKS.md) |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`boolean`\>

***

### toJSON()

> **toJSON**(): `object`

#### Returns

`object`

##### rawValue

> **rawValue**: `string`

***

### toString()

> **toString**(): `string`

Returns a string representation of an object.

#### Returns

`string`

## JWT Claim accessor

### audience

#### Get Signature

> **get** **audience**(): `string` \| `undefined`

Alias for `JWT.claims.aud`.

##### See

[RFC 7519 - "aud" (Audience) Claim](https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.3)

##### Returns

`string` \| `undefined`

***

### expirationTime

#### Get Signature

> **get** **expirationTime**(): [`Date`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Date) \| `undefined`

Alias for `JWT.claims.exp`, converted to a [Date](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Date).

##### See

[RFC 7519 - "exp" (Expiration Time) Claim](https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.4)

##### Returns

[`Date`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Date) \| `undefined`

***

### expiresIn

#### Get Signature

> **get** **expiresIn**(): `number`

Alias for `JWT.claims.exp`.

##### See

[RFC 7519 - "exp" (Expiration Time) Claim](https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.4)

##### Returns

`number`

#### Implementation of

[`Expires`](../interfaces/Expires.md).[`expiresIn`](../interfaces/Expires.md#expiresin)

***

### issuer

#### Get Signature

> **get** **issuer**(): `string` \| `undefined`

Alias for `JWT.claims.iss`.

##### See

[RFC 7519 - "iss" (Issuer) Claim](https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.1)

##### Returns

`string` \| `undefined`

***

### issuedAt

#### Get Signature

> **get** **issuedAt**(): [`Date`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Date) \| `undefined`

Alias for `JWT.claims.iat`, converted to a [Date](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Date).

##### See

[RFC 7519 - "iat" (Issued At) Claim](https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.6)

##### Returns

[`Date`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Date) \| `undefined`

#### Implementation of

[`Expires`](../interfaces/Expires.md).[`issuedAt`](../interfaces/Expires.md#issuedat)

***

### notBefore

#### Get Signature

> **get** **notBefore**(): [`Date`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Date) \| `undefined`

Alias for `JWT.claims.nbf`, converted to a [Date](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Date).

##### See

[RFC 7519 - "nbf" (Not Before) Claim](https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.5)

##### Returns

[`Date`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Date) \| `undefined`

***

### scope

#### Get Signature

> **get** **scope**(): `string`[] \| `undefined`

Alias for `JWT.claims.scp` and `JWT.scopes`.

##### See

[RFC 8693 - "scope" (Scopes) Claim](https://datatracker.ietf.org/doc/html/rfc8693#section-4.2)

##### Returns

`string`[] \| `undefined`

***

### scopes

#### Get Signature

> **get** **scopes**(): `string`[] \| `undefined`

Alias for `JWT.claims.scp` and `JWT.scope`.

##### See

[RFC 8693 - "scope" (Scopes) Claim](https://datatracker.ietf.org/doc/html/rfc8693#section-4.2)

##### Returns

`string`[] \| `undefined`

***

### subject

#### Get Signature

> **get** **subject**(): `string` \| `undefined`

Alias for `JWT.claims.sub`.

##### See

[RFC 7519 - "sub" (Subject) Claim](https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.2)

##### Returns

`string` \| `undefined`

***

### expiresAt

#### Get Signature

> **get** **expiresAt**(): [`Date`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Date) \| `undefined`

Alias for `JWT.expirationTime`.

##### Returns

[`Date`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Date) \| `undefined`

#### Implementation of

[`Expires`](../interfaces/Expires.md).[`expiresAt`](../interfaces/Expires.md#expiresat)
