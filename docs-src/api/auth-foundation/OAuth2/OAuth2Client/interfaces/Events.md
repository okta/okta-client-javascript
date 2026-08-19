[@okta/auth-foundation](../../..) / [OAuth2](../../index.md) / [OAuth2Client](../index.md) / Events

# Interface: Events

Map of events fired from [OAuth2Client.emitter](../index.md#emitter)

## Example

```ts
// key = Event name
// value = Event Type
client.emitter.on('will_send', ({ request }) => {
  console.log(request.url.href);
});
```

## Properties

### will\_send

> **will\_send**: `object`

Fired before a request is sent

| Name | Type |
| ------ | ------ |
| `request` | [`Request`](https://developer.mozilla.org/docs/Web/API/Request) |

#### Remarks

The `request` instance is `readonly`. For outgoing request customization see 
[APIClient.addInterceptor](../../../Networking/APIClient/index.md#addinterceptor)

***

### did\_send

> **did\_send**: `object`

Fired after a response is received

| Name | Type |
| ------ | ------ |
| `request` | [`Request`](https://developer.mozilla.org/docs/Web/API/Request) |
| `response` | [`Response`](https://developer.mozilla.org/docs/Web/API/Response) |

***

### network\_failure

> **network\_failure**: `object`

Fired after a [fetch](../../../Networking/APIClient/classes/Configuration.md#defaultoptions) call fails to complete (no response is received).
Usually indicated via `TypeError: Failed to fetch`

| Name | Type |
| ------ | ------ |
| `request` | [`Request`](https://developer.mozilla.org/docs/Web/API/Request) |
| `error` | [`APIClientError`](../../../Core/classes/APIClientError.md) |
| `cause` | [`Error`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Error) |

***

### token\_will\_refresh

> **token\_will\_refresh**: `object`

Triggered when a token refresh attempt begins

| Name | Type |
| ------ | ------ |
| `token` | [`Token`](../../../Token/index.md) |

***

### token\_did\_refresh

> **token\_did\_refresh**: `object`

Triggered when a token refresh attempt succeeds

| Name | Type |
| ------ | ------ |
| `token` | [`Token`](../../../Token/index.md) |
