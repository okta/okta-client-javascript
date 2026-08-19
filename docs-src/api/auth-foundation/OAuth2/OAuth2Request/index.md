[@okta/auth-foundation](../..) / [OAuth2](../index.md) / OAuth2Request

# Abstract Class: OAuth2Request

A builder class for [Request](https://developer.mozilla.org/docs/Web/API/Request) instances representing a OAuth2 endpoint request

## Constructors

### Constructor

> **new OAuth2Request**(`params`): `OAuth2Request`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `params` | [`RequestParams`](interfaces/RequestParams.md) |

#### Returns

`OAuth2Request`

## Properties

### headers

> **headers**: [`Headers`](https://developer.mozilla.org/docs/Web/API/Headers)

HTTP headers for the outgoing request

***

### body

> **body**: [`URLSearchParams`](https://developer.mozilla.org/docs/Web/API/URLSearchParams)

HTTP body for the outgoing request

***

### openIdConfiguration

> **openIdConfiguration**: [`OpenIdConfiguration`](../interfaces/OpenIdConfiguration.md)

Reference to the OAuth2 Metadata document from the authorization server

***

### clientConfiguration

> **clientConfiguration**: [`Configuration`](../classes/Configuration.md)

Configuration of the [OAuth2Client](../OAuth2Client/index.md) being used to send the request

***

### clientAuthentication

> **clientAuthentication**: `any`

Authentication setting for the authorization server. Only relevant to Confidental Clients

## Accessors

### url

#### Get Signature

> **get** `abstract` **url**(): `string`

Returns the URL of the request

##### Returns

`string`

## Methods

### prepare()

> **prepare**(`context?`): [`APIRequest`](../../Networking/classes/APIRequest.md)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `context` | `object` |

#### Returns

[`APIRequest`](../../Networking/classes/APIRequest.md)

## Interfaces

| Interface | Description |
| ------ | ------ |
| [RequestParams](interfaces/RequestParams.md) | - |
