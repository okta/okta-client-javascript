[@okta/auth-foundation](../../..) / [Networking](../../index.md) / [APIClient](../index.md) / Configuration

# Class: Configuration

An entity which can be converted to a JSON representation, usually used for serialization

## Extended by

- [`Configuration`](../../../OAuth2/classes/Configuration.md)

## Implements

- [`JSONSerializable`](../../../Core/interfaces/JSONSerializable.md)

## Constructors

### Constructor

> **new Configuration**(`params`): `Configuration`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `params` | [`ConfigurationParams`](../type-aliases/ConfigurationParams.md) |

#### Returns

`Configuration`

## Properties

### DefaultOptions

> `static` **DefaultOptions**: `object`

| Name | Type |
| ------ | ------ |
| `dpop` | `boolean` |
| `fetchImpl()?` | \{(`input`, `init?`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Response`](https://developer.mozilla.org/docs/Web/API/Response)\>; (`input`, `init?`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Response`](https://developer.mozilla.org/docs/Web/API/Response)\>; (`input`, `init?`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Response`](https://developer.mozilla.org/docs/Web/API/Response)\>; \} |

#### Default Value

```ts
{ dpop: false }
```

***

### dpop

> **dpop**: `boolean` = `false`

When `true`, client will utilize DPoP-bound tokens.

#### Remarks

Highly recommended feature; greatly improves security posture.

#### See

[DPoP RFC](https://datatracker.ietf.org/doc/html/rfc9449)

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

## Methods

### toJSON()

> **toJSON**(): [`JsonRecord`](../../../Core/type-aliases/JsonRecord.md)

Returns JSON representiation of :class \| Configuration

#### Returns

[`JsonRecord`](../../../Core/type-aliases/JsonRecord.md)

#### Implementation of

[`JSONSerializable`](../../../Core/interfaces/JSONSerializable.md).[`toJSON`](../../../Core/interfaces/JSONSerializable.md#tojson)
