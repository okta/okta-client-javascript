[@okta/auth-foundation](../..) / [Networking](../index.md) / APIClient

# Abstract Class: APIClient\<E\>

Generic HTTP client with built in request retry

## Example

To add an event within a derived class, first extend [APIClient.Events](interfaces/Events.md), like so:
```ts
type MyAPIEvents = { 'foo': { bar: number } } & APIClient.Events;

class MyAPIClient<E extends MyAPIEvents = MyAPIEvents> extends APIClient<E> {
  protected async send (request: APIRequest): Promise<Response> {
    // this will be properly type checked
    this.emitter('foo', { bar: 1 });
    return super.send(request);
  }
}
```

## Remarks

Most application developers won't need to extend this class directly — reach for
[OAuth2Client](../../OAuth2/OAuth2Client/index.md) or [FetchClient](../../FetchClient/index.md) instead

## Extended by

- [`FetchClient`](../../FetchClient/classes/FetchClient.md)
- [`OAuth2Client`](../../OAuth2/OAuth2Client/index.md)

## Type Parameters

| Type Parameter | Default type | Description |
| ------ | ------ | ------ |
| `E` *extends* [`Events`](interfaces/Events.md) | [`Events`](interfaces/Events.md) | Map of all events fired from [APIClient.emitter](#emitter) |

## Constructors

### Constructor

> **new APIClient**\<`E`\>(`params?`): `APIClient`\<`E`\>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `params` | [`Configuration`](classes/Configuration.md) \| [`ConfigurationParams`](type-aliases/ConfigurationParams.md) |

#### Returns

`APIClient`\<`E`\>

## Properties

### configuration

> `readonly` **configuration**: [`Configuration`](classes/Configuration.md)

***

### emitter

> `readonly` **emitter**: [`EventEmitter`](../../Core/classes/EventEmitter.md)\<`E`\>

Possible events: [APIClient.Events](interfaces/Events.md)

***

### dpopNonceCache

> `protected` `readonly` **dpopNonceCache**: [`DPoPNonceCache`](../../OAuth2/interfaces/DPoPNonceCache.md)

A cache of `dpop-nonce` values returned by authorization or resource servers.
The cached nonce values will be used when generating DPoP JWTs for outgoing requests.

#### Remarks

Only relevant if client is configured with `dpop: true`

***

### defaultHeaders

> **defaultHeaders**: [`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)\<`string`, `string`\>

Map of HTTP headers to apply to every request

***

### defaultRequestOptions

> **defaultRequestOptions**: [`RequestOptions`](type-aliases/RequestOptions.md)

Default [APIClient.RequestOptions](type-aliases/RequestOptions.md) to apply to every request

## Methods

### processResponse()

> `protected` **processResponse**(`response`, `request`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>

Called on every [Response](https://developer.mozilla.org/docs/Web/API/Response) received.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `response` | [`Response`](https://developer.mozilla.org/docs/Web/API/Response) |
| `request` | [`APIRequest`](../classes/APIRequest.md) |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>

***

### processErrorResponse()

> `protected` **processErrorResponse**(`response`, `request`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Response`](https://developer.mozilla.org/docs/Web/API/Response)\>

Called on every [Response](https://developer.mozilla.org/docs/Web/API/Response) where `response.ok` is `false`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `response` | [`Response`](https://developer.mozilla.org/docs/Web/API/Response) |
| `request` | [`APIRequest`](../classes/APIRequest.md) |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Response`](https://developer.mozilla.org/docs/Web/API/Response)\>

#### Example

When processing a [Response](https://developer.mozilla.org/docs/Web/API/Response), `processErrorResponse` may invoke [APIClient.retry](#retry). Therefore, when extending
`APIClient` and calling `super.processErrorResponse` the same error condition could be handled twice erroneously.<br/>
To prevent this, check if the parameter `response` and the return value of `super.processErrorResponse` are equal (the
same [Response](https://developer.mozilla.org/docs/Web/API/Response) instance). If they are not equal, the `response` was already retried.
```ts
class MyAPIClient extends APIClient {
  protected async processErrorResponse (response: Response, request: APIRequest): Promise<Response> {
    const res = await super.processErrorResponse(response, request);
    if (response !== res) {
      // response was already retried, return new `Response` instance.
      return res;
    }
    response = res;

    // handle other scenarios here

    return response;
  }
}
```

***

### authorize()

> `abstract` `protected` **authorize**(`request`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>

Signs an outgoing [APIRequest](../classes/APIRequest.md) with required authentication information.

This method is marked as `abstract` since not every API requires authentication.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `request` | [`APIRequest`](../classes/APIRequest.md) |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>

#### Remarks

Most implementations of this method usually invoke [Token.authorize](../../Token/index.md#authorize)

***

### sendRequest()

> `protected` **sendRequest**(`request`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Response`](https://developer.mozilla.org/docs/Web/API/Response)\>

**Do not call directly** use [APIClient.send](#send).

This method provides an alternative means to provide a custom [fetch](classes/Configuration.md#defaultoptions) implementation. By default,
this method invokes [.fetchImpl](classes/Configuration.md#fetchimpl) and falls back to `globalThis.fetch`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `request` | [`Request`](https://developer.mozilla.org/docs/Web/API/Request) |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Response`](https://developer.mozilla.org/docs/Web/API/Response)\>

#### Example

```ts
class MyAPIClient extends APIClient {
  protected sendRequest (request: Request): Promise<Response> {
    return customFetch(request);
  }
}
```

***

### send()

> `protected` **send**(`request`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Response`](https://developer.mozilla.org/docs/Web/API/Response)\>

Sends an outgoing [APIRequest](../classes/APIRequest.md) and processes the [Response](https://developer.mozilla.org/docs/Web/API/Response).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `request` | [`APIRequest`](../classes/APIRequest.md) |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Response`](https://developer.mozilla.org/docs/Web/API/Response)\>

#### Remarks

It's **NOT** recommended to override this method, as it contains the majority of the business logic

***

### retry()

> `protected` **retry**(`request`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Response`](https://developer.mozilla.org/docs/Web/API/Response)\>

Prepares a [APIRequest](../classes/APIRequest.md) for a retry attempt and sends the retry request. Usually invoked within
[APIClient.processErrorResponse](#processerrorresponse)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `request` | [`APIRequest`](../classes/APIRequest.md) |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Response`](https://developer.mozilla.org/docs/Web/API/Response)\>

***

### getRetryDelay()

> `protected` **getRetryDelay**(`response`, `request`): `number`

Calculates a delay to wait before retrying a [APIRequest](../classes/APIRequest.md) which previously responded with `429`.
Useful for rate limited APIs.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `response` | [`Response`](https://developer.mozilla.org/docs/Web/API/Response) |
| `request` | [`APIRequest`](../classes/APIRequest.md) |

#### Returns

`number`

***

### fetch()

> **fetch**(...`args`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Response`](https://developer.mozilla.org/docs/Web/API/Response)\>

A `public` method to expose [APIClient.send](#send)

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| ...`args` | \[`string` \| [`URL`](https://developer.mozilla.org/docs/Web/API/URL) \| [`Request`](https://developer.mozilla.org/docs/Web/API/Request), [`APIRequestInit`](../type-aliases/APIRequestInit.md)\] | matches call signature of [fetch](https://developer.mozilla.org/docs/Web/API/Window/fetch) |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Response`](https://developer.mozilla.org/docs/Web/API/Response)\>

#### Example

```ts
class MyAPIClient extends APIClient {...}
const client = new MyAPIClient();

async function fetchData () {
  return client.fetch('/foo');
}
```

## DPoP

### getDPoPNonceCacheKey()

> `protected` **getDPoPNonceCacheKey**(`request`): `string`

Returns a key for a giving request to store or retrieve nonce values from the [APIClient.dpopNonceCache](#dpopnoncecache)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `request` | [`Request`](https://developer.mozilla.org/docs/Web/API/Request) |

#### Returns

`string`

***

### getDPoPNonceFromCache()

> `protected` **getDPoPNonceFromCache**(`request`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`string` \| `undefined`\>

Retrieves a nonce value from the [APIClient.dpopNonceCache](#dpopnoncecache)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `request` | [`Request`](https://developer.mozilla.org/docs/Web/API/Request) |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`string` \| `undefined`\>

***

### cacheDPoPNonce()

> `protected` **cacheDPoPNonce**(`request`, `nonce`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>

Caches an incoming nonce value from the [APIClient.dpopNonceCache](#dpopnoncecache)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `request` | [`Request`](https://developer.mozilla.org/docs/Web/API/Request) |
| `nonce` | `string` |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>

***

### checkForDPoPNonceErrorResponse()

> `abstract` `protected` **checkForDPoPNonceErrorResponse**(`response`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`string` \| `undefined`\>

Determines if a [Response](https://developer.mozilla.org/docs/Web/API/Response) indicates a DPoP nonce error. If error is present, returns
the value of the `dpop-nonce` response header.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `response` | [`Response`](https://developer.mozilla.org/docs/Web/API/Response) |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`string` \| `undefined`\>

#### Remarks

* [OAuth2.OAuth2Client](../../OAuth2/OAuth2Client/index.md) provides an authorization server-provided nonce implementation
* [FetchClient](../../FetchClient/index.md) provides an resource server-provided nonce implementation

#### See

* [RFC 9449 - DPoP Nonce Downgrade](https://datatracker.ietf.org/doc/html/rfc9449#section-11.3)
* [RFC 9449 - Authorization Server-Provided Nonce](https://datatracker.ietf.org/doc/html/rfc9449#section-8)
* [RFC 9449 - Resource Server-Provided Nonce](https://datatracker.ietf.org/doc/html/rfc9449#section-9)

***

### prepareDPoPNonceRetry()

> `abstract` `protected` **prepareDPoPNonceRetry**(`request`, `nonce`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>

Prepares an [APIRequest](../classes/APIRequest.md) for a retry with a new `dpop-nonce` value

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `request` | [`APIRequest`](../classes/APIRequest.md) |
| `nonce` | `string` |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>

#### See

* [APIClient.checkForDPoPNonceErrorResponse](#checkfordpopnonceerrorresponse)
* [RFC 9449 - Authorization Server-Provided Nonce](https://datatracker.ietf.org/doc/html/rfc9449#section-8)
* [RFC 9449 - Resource Server-Provided Nonce](https://datatracker.ietf.org/doc/html/rfc9449#section-9)

## Interceptors

### addInterceptor()

> **addInterceptor**(`interceptor`): `void`

Registers an [APIClient.RequestInterceptor](type-aliases/RequestInterceptor.md) on the APIClient

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `interceptor` | [`RequestInterceptor`](type-aliases/RequestInterceptor.md) |

#### Returns

`void`

#### Example

```ts
const interceptor = (request: Request) => {
  req.headers.append('foo', '1');
  return req;
};
client.addInterceptor(interceptor);
```

***

### removeInterceptor()

> **removeInterceptor**(`interceptor`): `void`

Unregisters an [APIClient.RequestInterceptor](type-aliases/RequestInterceptor.md) on the APIClient

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `interceptor` | [`RequestInterceptor`](type-aliases/RequestInterceptor.md) |

#### Returns

`void`

#### Example

```ts
const interceptor = (request: Request) => { ... };
client.addInterceptor(interceptor);
...
client.removeInterceptor(interceptor);
```

## Classes

| Class | Description |
| ------ | ------ |
| [Configuration](classes/Configuration.md) | An entity which can be converted to a JSON representation, usually used for serialization |

## Functions

| Function | Description |
| ------ | ------ |
| [isNetworkError](functions/isNetworkError.md) | Determines whether a value is an [Error](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Error) indicating network connectivity problems when awaiting a [fetch](https://developer.mozilla.org/docs/Web/API/Window/fetch) request. |

## Interfaces

| Interface | Description |
| ------ | ------ |
| [Events](interfaces/Events.md) | Map of events fired from [APIClient.emitter](index.md#emitter) |

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [ConfigurationParams](type-aliases/ConfigurationParams.md) | Options to provide to [Configuration](classes/Configuration.md) at instantiation |
| [RequestOptions](type-aliases/RequestOptions.md) | Options which control how an [APIClient](index.md) sends a request. |
| [RequestInterceptor](type-aliases/RequestInterceptor.md) | Function signature for [APIClient](index.md) request interceptors. |
