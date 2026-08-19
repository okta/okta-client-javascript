[@okta/auth-foundation](..) / Token

# Class: Token

Internal representation of a OAuth2/OIDC Token.
Contains `accessToken`, conditionally contains `idToken` and `refreshToken`

## Remarks

Most operations can be done by [Credential](https://developer.mozilla.org/docs/Web/API/Credential) methods. It's recommended
to use those instead before reaching for a Token method

## See

- Okta Documentation: [OIDC](https://developer.okta.com/docs/reference/api/oidc/#response-properties-4)

## Implements

- [`JSONSerializable`](../Core/interfaces/JSONSerializable.md)
- [`Expires`](../Core/interfaces/Expires.md)
- [`RequestAuthorizer`](../Core/interfaces/RequestAuthorizer.md)

## Constructors

### Constructor

> **new Token**(`obj`): `Token`

The constructor of Token

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `obj` | [`TokenInit`](type-aliases/TokenInit.md) |

#### Returns

`Token`

## Properties

### id

> `readonly` **id**: `string`

***

### issuedAt

> `readonly` **issuedAt**: [`Date`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Date)

#### Implementation of

[`Expires`](../Core/interfaces/Expires.md).[`issuedAt`](../Core/interfaces/Expires.md#issuedat)

***

### tokenType

> `readonly` **tokenType**: [`TokenType`](../OAuth2/type-aliases/TokenType.md)

The audience of the token. ex `Bearer` or `DPoP`

***

### expiresIn

> `readonly` **expiresIn**: `number`

Seconds until token expires

#### Implementation of

[`Expires`](../Core/interfaces/Expires.md).[`expiresIn`](../Core/interfaces/Expires.md#expiresin)

***

### scope

> `readonly` **scope**: `string` = `''`

OAuth2 / OIDC scopes associated with token

***

### accessToken

> `readonly` **accessToken**: `string`

String value of `accessToken`

***

### idToken?

> `readonly` `optional` **idToken?**: [`JWT`](../Core/classes/JWT.md)

If the OAuth2 configuration includes OIDC, an `idToken` will be available

***

### refreshToken?

> `readonly` `optional` **refreshToken?**: `string`

If the OAuth2 configuration includes the scope `offline_access`, a `refreshToken` will be available

***

### context

> `readonly` **context**: [`Context`](type-aliases/Context.md)

Defines the context this token was issued from

## Accessors

### expiresAt

#### Get Signature

> **get** **expiresAt**(): [`Date`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Date)

When the Token will expire, represented as a `Date`

##### Returns

[`Date`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Date)

#### Implementation of

[`Expires`](../Core/interfaces/Expires.md).[`expiresAt`](../Core/interfaces/Expires.md#expiresat)

***

### isExpired

#### Get Signature

> **get** **isExpired**(): `boolean`

Compares `this.expiresAt` against `TimeCoordinator` to determine if Token is expired

##### Returns

`boolean`

#### Implementation of

[`Expires`](../Core/interfaces/Expires.md).[`isExpired`](../Core/interfaces/Expires.md#isexpired)

***

### isValid

#### Get Signature

> **get** **isValid**(): `boolean`

Returns `true` if the :class \| Token is _not_ expired

##### See

[Token.isExpired](#isexpired)

##### Returns

`boolean`

#### Implementation of

[`Expires`](../Core/interfaces/Expires.md).[`isValid`](../Core/interfaces/Expires.md#isvalid)

***

### scopes

#### Get Signature

> **get** **scopes**(): `string`[]

Returns the OAuth2 `scope`(s) used to issue the token

##### Returns

`string`[]

## Methods

### serializer()

> `static` **serializer**(`t`): `string`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `t` | `object` |

#### Returns

`string`

***

### isEqual()

> `static` **isEqual**(`lhs`, `rhs`): `boolean`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `lhs` | `Token` |
| `rhs` | `Token` |

#### Returns

`boolean`

***

### from()

> `static` **from**(`refreshToken`, `client`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`Token`\>

Performs a token refresh using the provided `refreshToken`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `refreshToken` | `string` |
| `client` | [`OAuth2Client`](../OAuth2/OAuth2Client/index.md) |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`Token`\>

***

### willBeExpiredIn()

> **willBeExpiredIn**(`duration`): `boolean`

Returns `true` if the :class \| Token will expire after a duration (seconds)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `duration` | `number` |

#### Returns

`boolean`

#### See

[Token.willBeValidIn](#willbevalidin)

***

### willBeValidIn()

> **willBeValidIn**(`duration`): `boolean`

Returns `true` if the :class \| Token will _not_ expire after a duration (seconds)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `duration` | `number` |

#### Returns

`boolean`

#### See

[Token.willBeExpiredIn](#willbeexpiredin)

***

### toJSON()

> **toJSON**(): [`JsonRecord`](../Core/type-aliases/JsonRecord.md)

Converts a :class \| Token instance to an serializable object literal representation

#### Returns

[`JsonRecord`](../Core/type-aliases/JsonRecord.md)

#### Implementation of

[`JSONSerializable`](../Core/interfaces/JSONSerializable.md).[`toJSON`](../Core/interfaces/JSONSerializable.md#tojson)

***

### merge()

> **merge**(`token`): `Token`

Used to merge separate :class \| Token instances together. Useful when handling token refresh as
not every value is returned in a refresh request compared to the initial token request

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `token` | `Token` | the "old" token instance to be merged into the "new" token |

#### Returns

`Token`

new :class \| Token instance

***

### serialize()

> **serialize**(): `string`

#### Returns

`string`

***

### authorize()

> **authorize**(`input`, `init?`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Request`](https://developer.mozilla.org/docs/Web/API/Request)\>

Signs a outgoing [Request](https://developer.mozilla.org/en-US/docs/Web/API/Request) with an `Authorization` header.
Accepts the same method signature as [fetch](https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | `string` \| [`URL`](https://developer.mozilla.org/docs/Web/API/URL) \| [`Request`](https://developer.mozilla.org/docs/Web/API/Request) |
| `init` | `RequestInit` & `object` |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Request`](https://developer.mozilla.org/docs/Web/API/Request)\>

[Request](https://developer.mozilla.org/en-US/docs/Web/API/Request) wrapped in a `Promise`

#### Implementation of

[`RequestAuthorizer`](../Core/interfaces/RequestAuthorizer.md).[`authorize`](../Core/interfaces/RequestAuthorizer.md#authorize)

## Functions

| Function | Description |
| ------ | ------ |
| [extractContext](functions/extractContext.md) | Utility function for extracting [Token.Context](type-aliases/Context.md) from an union-type object like [:TYPE \| Token.Metadata](functions/Metadata.md) |
| [Metadata](functions/Metadata.md) | Returns [:type \| Token.Metadata](functions/Metadata.md) for a given [:class \| Token](index.md) |

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [Context](type-aliases/Context.md) | Context used to request the token |
| [Metadata](type-aliases/Metadata.md) | Non-sensitive metadata associated with a [:class \| Token](index.md). Used to store [Token.Context](type-aliases/Context.md) and additional metadata for a given [:class \| Token](index.md) |
| [RevokeType](type-aliases/RevokeType.md) | Possible values provided to [OAuth2Client.revoke](../OAuth2/OAuth2Client/index.md#revoke) to determine which tokens to revoke * `'ALL'` - revokes both the `access_token` and `refresh_token`. * `'ACCESS'` - revokes **only** the `access_token`. * `'REFRESH'` - revokes **only** the `refresh_token`. |
| [Kind](type-aliases/Kind.md) | Possible values provided to [OAuth2Client.introspect](../OAuth2/OAuth2Client/index.md#introspect) to determine which token to introspect |
| [IntrospectResponse](type-aliases/IntrospectResponse.md) | Payload structure of a `/introspect` response |
