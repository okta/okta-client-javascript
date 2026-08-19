[@okta/auth-foundation](../..) / [OAuth2](../index.md) / OAuth2Client

# Class: OAuth2Client\<E\>

## Extends

- [`APIClient`](../../Networking/APIClient/index.md)\<`E`\>

## Type Parameters

| Type Parameter | Default type | Description |
| ------ | ------ | ------ |
| `E` *extends* [`Events`](interfaces/Events.md) | [`Events`](interfaces/Events.md) | Map of all events fired from [APIClient.emitter](../../Networking/APIClient/index.md#emitter) |

## Constructors

### Constructor

> **new OAuth2Client**\<`E`\>(`params`): `OAuth2Client`\<`E`\>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `params` | [`ConfigurationParams`](../interfaces/ConfigurationParams.md) \| [`Configuration`](../classes/Configuration.md) |

#### Returns

`OAuth2Client`\<`E`\>

#### Overrides

[`APIClient`](../../Networking/APIClient/index.md).[`constructor`](../../Networking/APIClient/index.md#constructor)

## Properties

### emitter

> `readonly` **emitter**: [`EventEmitter`](../../Core/classes/EventEmitter.md)\<`E`\>

Possible events: [OAuth2Client.Events](interfaces/Events.md)

#### Overrides

[`APIClient`](../../Networking/APIClient/index.md).[`emitter`](../../Networking/APIClient/index.md#emitter)

***

### configuration

> `readonly` **configuration**: [`Configuration`](../classes/Configuration.md)

Configuration of client

#### Remarks

#### Overrides

[`APIClient`](../../Networking/APIClient/index.md).[`configuration`](../../Networking/APIClient/index.md#configuration)

## Methods

### openIdConfiguration()

> **openIdConfiguration**(`options?`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`OpenIdConfiguration`](../interfaces/OpenIdConfiguration.md)\>

Retrieves the uthorization server's OpenID configuration

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | `GetJsonOptions` |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`OpenIdConfiguration`](../interfaces/OpenIdConfiguration.md)\>

#### See

[RFC 8414: Obtaining Authorization Server Metadata](https://datatracker.ietf.org/doc/html/rfc8414#section-3)

***

### jwks()

> **jwks**(`options?`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`JWKS`](../../Core/type-aliases/JWKS.md)\>

Retrieves authorization server's `jwks_uri` endpoint.
Resulting [JWKS](../../Core/type-aliases/JWKS.md) are used to perform `id_token` validation

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | `GetJsonOptions` |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`JWKS`](../../Core/type-aliases/JWKS.md)\>

#### See

[RFC 8414 - Authorization Server Metadata](https://datatracker.ietf.org/doc/html/rfc8414#section-2)

***

### exchange()

> **exchange**(`request`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`OAuth2ErrorResponse`](../interfaces/OAuth2ErrorResponse.md) \| [`Token`](../../Token/index.md)\>

Attempts a `token_endpoint` request. If the request is sucessful, the resulting tokens are validated

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `request` | `TokenRequest` |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`OAuth2ErrorResponse`](../interfaces/OAuth2ErrorResponse.md) \| [`Token`](../../Token/index.md)\>

#### See

* [RFC 8414 - Authorization Server Metadata](https://datatracker.ietf.org/doc/html/rfc8414#section-2)
* [OIDC 1.0 - ID Token Validation](https://openid.net/specs/openid-connect-core-1_0.html#IDTokenValidation)

***

### refresh()

> **refresh**(`token`, `scopes?`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`OAuth2ErrorResponse`](../interfaces/OAuth2ErrorResponse.md) \| [`Token`](../../Token/index.md)\>

Attempts to refresh the provided token, using the [refreshToken](../../Token/index.md#refreshtoken)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `token` | [`Token`](../../Token/index.md) |
| `scopes?` | `string`[] |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`OAuth2ErrorResponse`](../interfaces/OAuth2ErrorResponse.md) \| [`Token`](../../Token/index.md)\>

#### Remarks

Requires `offline_access` to a scope in the orginial authentication request

#### See

[RFC 6749 - Refreshing an Access Token](https://datatracker.ietf.org/doc/html/rfc6749#section-6)

***

### revoke()

> **revoke**(`token`, `type`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void` \| [`OAuth2ErrorResponse`](../interfaces/OAuth2ErrorResponse.md)\>

Attempts a `revocation_endpoint` request with the provided [Token](../../Token/index.md)

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `token` | [`Token`](../../Token/index.md) | The token to be revoked |
| `type` | `"ALL"` \| `"ACCESS"` \| `"REFRESH"` | Possible values:<br/> * `'ALL'` - revokes both the `access_token` and `refresh_token`.<br/> * `'ACCESS'` - revokes **only** the `access_token`.<br/> * `'REFRESH'` - revokes **only** the `refresh_token`. |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void` \| [`OAuth2ErrorResponse`](../interfaces/OAuth2ErrorResponse.md)\>

#### See

[RFC 7009 - OAuth 2.0 Token Revocation](https://datatracker.ietf.org/doc/html/rfc7009)

***

### introspect()

> **introspect**(`token`, `kind`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`OAuth2ErrorResponse`](../interfaces/OAuth2ErrorResponse.md) \| [`IntrospectResponse`](../../Token/type-aliases/IntrospectResponse.md)\>

Attempts an `introspection_endpoint` request with the provided [Token](../../Token/index.md)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `token` | [`Token`](../../Token/index.md) |
| `kind` | `"refresh_token"` \| `"access_token"` \| `"id_token"` |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`OAuth2ErrorResponse`](../interfaces/OAuth2ErrorResponse.md) \| [`IntrospectResponse`](../../Token/type-aliases/IntrospectResponse.md)\>

#### See

[RFC 7662 - OAuth 2.0 Token Introspection](https://datatracker.ietf.org/doc/html/rfc7662)

***

### userInfo()

> **userInfo**(`token`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`OAuth2ErrorResponse`](../interfaces/OAuth2ErrorResponse.md) \| \{\[`key`: `string`\]: [`JsonPrimitive`](../../Core/type-aliases/JsonPrimitive.md); \}\>

Attempts an `userinfo_endpoint` request with the provided [Token](../../Token/index.md)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `token` | [`Token`](../../Token/index.md) |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`OAuth2ErrorResponse`](../interfaces/OAuth2ErrorResponse.md) \| \{\[`key`: `string`\]: [`JsonPrimitive`](../../Core/type-aliases/JsonPrimitive.md); \}\>

#### Remarks

The user profile returned by this method will vary based on user's profle data and organization settings

#### See

[OIDC 1.0 - UserInfo Endpoint](https://openid.net/specs/openid-connect-core-1_0.html#UserInfo)

## Validators

### idTokenValidator

> `readonly` `static` **idTokenValidator**: [`IDTokenValidator`](../../Core/interfaces/IDTokenValidator.md) = `DefaultIDTokenValidator`

***

### accessTokenValidator

> `readonly` `static` **accessTokenValidator**: [`TokenHashValidator`](../../Core/interfaces/TokenHashValidator.md)

## Functions

| Function | Description |
| ------ | ------ |
| [isDPoPProofClockSkewError](functions/isDPoPProofClockSkewError.md) | When a client has the incorrect time, all DPoP JWTs signed by the client will be rejected by the authorization or resource server because the JWT's claims cannot be validated. This method checks server responses for this specific error condition. |

## Interfaces

| Interface | Description |
| ------ | ------ |
| [Events](interfaces/Events.md) | Map of events fired from [OAuth2Client.emitter](index.md#emitter) |
