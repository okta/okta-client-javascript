[@okta/auth-foundation](../..) / [OAuth2](../index.md) / Configuration

# Class: Configuration

Options to customize the behavior of a [OAuth2Client](../OAuth2Client/index.md) instance

## See

[RFC 8414: OAuth 2.0 Authorization Server Metadata](https://datatracker.ietf.org/doc/html/rfc8414)

## Extends

- [`Configuration`](../../Networking/APIClient/classes/Configuration.md)

## Implements

- [`APIClientConfiguration`](../interfaces/APIClientConfiguration.md)
- [`JSONSerializable`](../../Core/interfaces/JSONSerializable.md)

## Constructors

### Constructor

> **new Configuration**(`params`): `Configuration`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `params` | [`ConfigurationParams`](../interfaces/ConfigurationParams.md) |

#### Returns

`Configuration`

#### Overrides

[`Configuration`](../../Networking/APIClient/classes/Configuration.md).[`constructor`](../../Networking/APIClient/classes/Configuration.md#constructor)

## Properties

### DefaultOptions

> `static` **DefaultOptions**: [`Required`](https://www.typescriptlang.org/docs/handbook/utility-types.html#requiredtype)\<[`OAuth2ClientOptions`](../type-aliases/OAuth2ClientOptions.md)\> & `object`

#### Type Declaration

| Name | Type |
| ------ | ------ |
| `dpop` | `boolean` |
| `fetchImpl()?` | \{(`input`, `init?`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Response`](https://developer.mozilla.org/docs/Web/API/Response)\>; (`input`, `init?`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Response`](https://developer.mozilla.org/docs/Web/API/Response)\>; (`input`, `init?`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Response`](https://developer.mozilla.org/docs/Web/API/Response)\>; \} |

#### Default Value

```ts
{
  allowHTTP: false,
  syncClockWithAuthorizationServer: true,
  authentication: 'none',

  // inherited from APIClient
  dpop: false
}
```

#### Overrides

[`Configuration`](../../Networking/APIClient/classes/Configuration.md).[`DefaultOptions`](../../Networking/APIClient/classes/Configuration.md#defaultoptions)

***

### dpop

> **dpop**: `boolean` = `false`

When `true`, client will utilize DPoP-bound tokens.

#### Remarks

Highly recommended feature; greatly improves security posture.

#### See

[DPoP RFC](https://datatracker.ietf.org/doc/html/rfc9449)

#### Inherited from

[`Configuration`](../../Networking/APIClient/classes/Configuration.md).[`dpop`](../../Networking/APIClient/classes/Configuration.md#dpop)

***

### fetchImpl?

> `optional` **fetchImpl?**: \{(`input`, `init?`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Response`](https://developer.mozilla.org/docs/Web/API/Response)\>; (`input`, `init?`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Response`](https://developer.mozilla.org/docs/Web/API/Response)\>; (`input`, `init?`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Response`](https://developer.mozilla.org/docs/Web/API/Response)\>; \}

Implementation of [fetch](https://developer.mozilla.org/docs/Web/API/Window/fetch) used by the client. Defaults to `globalThis.fetch`.

#### Call Signature

> (`input`, `init?`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Response`](https://developer.mozilla.org/docs/Web/API/Response)\>

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/fetch)

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | [`URL`](https://developer.mozilla.org/docs/Web/API/URL) \| `RequestInfo` |
| `init?` | `RequestInit` |

##### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Response`](https://developer.mozilla.org/docs/Web/API/Response)\>

#### Call Signature

> (`input`, `init?`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Response`](https://developer.mozilla.org/docs/Web/API/Response)\>

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/fetch)

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | `RequestInfo` |
| `init?` | `RequestInit` |

##### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Response`](https://developer.mozilla.org/docs/Web/API/Response)\>

#### Call Signature

> (`input`, `init?`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Response`](https://developer.mozilla.org/docs/Web/API/Response)\>

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/fetch)

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | `string` \| [`URL`](https://developer.mozilla.org/docs/Web/API/URL) \| [`Request`](https://developer.mozilla.org/docs/Web/API/Request) |
| `init?` | `RequestInit` |

##### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Response`](https://developer.mozilla.org/docs/Web/API/Response)\>

#### Remarks

Providing a custom [fetch](https://developer.mozilla.org/docs/Web/API/Window/fetch) implementation can enable greater HTTP request customizations.

#### Inherited from

[`Configuration`](../../Networking/APIClient/classes/Configuration.md).[`fetchImpl`](../../Networking/APIClient/classes/Configuration.md#fetchimpl)

***

### issuer

> `readonly` **issuer**: [`URL`](https://developer.mozilla.org/docs/Web/API/URL)

URL of the authorization server.

***

### discoveryURL

> `readonly` **discoveryURL**: [`URL`](https://developer.mozilla.org/docs/Web/API/URL)

URL of the authorization server's Metadata document

#### Default Value

```ts
this.issuer + '/.well-known/openid-configuration'
```

#### See

[RFC 8414: Obtaining Authorization Server Metadata](https://datatracker.ietf.org/doc/html/rfc8414#section-3)

***

### clientId

> `readonly` **clientId**: `string`

Authorization server client identifier.

#### Remarks

The client identifier will be generated by the authorization server during client registration.

#### See

[RFC 6749: Client Identifier](https://datatracker.ietf.org/doc/html/rfc6749#section-2.2)

***

### scopes

> **scopes**: `string`

Default `scope` value to be provided in authenication and token requests to the authorization server.

#### See

* [Okta Auth Server](https://developer.okta.com/docs/api/openapi/okta-oauth/oauth/orgas/authorize#orgas/authorize/t=request&in=query&path=scope)
* [Okta Scopes](https://developer.okta.com/docs/api/oauth2)
* [RFC 6749: Access Token Scope](https://datatracker.ietf.org/doc/html/rfc6749#section-3.3)

***

### authentication

> **authentication**: `"none"` = `'none'`

Enum for possible authentication stratgies for authorization server requests. Defaults to `none` (aka public client)

#### See

[RFC 6749: Client Authentication](https://datatracker.ietf.org/doc/html/rfc6749#section-2.3)

***

### allowHTTP

> **allowHTTP**: `boolean` = `false`

When `true`, issuer and other .well-known endpoints can be HTTP. Defaults to `false`

***

### syncClockWithAuthorizationServer

> **syncClockWithAuthorizationServer**: `boolean` = `true`

When `true`, the `Date` header from HTTP requests made to the authorization server will be
used to calculate a clock skew between the authorization server and the system clock. This is
useful for situations when the client's system clock is set to something other than the "true time".

Defaults to `true`.

#### Remarks

By default, the `Date` header is not safelisted for CORS requests. The authorization Server will need
to include the `Date` header in the `allow-control-expose-headers` for this feature to work properly
when requests the authorization server and application are hosted on different origins.

Reference: https://developer.mozilla.org/en-US/docs/Glossary/CORS-safelisted_response_header

## Accessors

### baseURL

#### Get Signature

> **get** **baseURL**(): [`URL`](https://developer.mozilla.org/docs/Web/API/URL)

Alias to [issuer](#issuer) for backwards compatibility

##### Returns

[`URL`](https://developer.mozilla.org/docs/Web/API/URL)

#### Implementation of

[`APIClientConfiguration`](../interfaces/APIClientConfiguration.md).[`baseURL`](../interfaces/APIClientConfiguration.md#baseurl)

## Methods

### matches()

> **matches**(`params`): `boolean`

Determines whether a parameter collection matches the configuration of this client

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `params` | [`OAuth2Params`](../type-aliases/OAuth2Params.md) |

#### Returns

`boolean`

***

### getOptions()

> **getOptions**(): [`OAuth2ClientOptions`](../type-aliases/OAuth2ClientOptions.md)

Returns configurations values of the client, omitting OAuth2 parameters

#### Returns

[`OAuth2ClientOptions`](../type-aliases/OAuth2ClientOptions.md)

#### See

[Configuration.toJSON](#tojson)

***

### toJSON()

> **toJSON**(): [`JsonRecord`](../../Core/type-aliases/JsonRecord.md)

Returns JSON representation of the client's configuration

#### Returns

[`JsonRecord`](../../Core/type-aliases/JsonRecord.md)

#### See

[Configuration.getOptions](#getoptions)

#### Implementation of

[`JSONSerializable`](../../Core/interfaces/JSONSerializable.md).[`toJSON`](../../Core/interfaces/JSONSerializable.md#tojson)

#### Overrides

[`Configuration`](../../Networking/APIClient/classes/Configuration.md).[`toJSON`](../../Networking/APIClient/classes/Configuration.md#tojson)
