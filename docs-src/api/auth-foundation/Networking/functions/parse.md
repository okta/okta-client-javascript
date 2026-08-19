[@okta/auth-foundation](../..) / [Networking](../index.md) / parse

# Function: parse()

> **parse**(`header`): [`WWWAuthenticateError`](../interfaces/WWWAuthenticateError.md) \| `null`

Parses a `www-authenticate` header and returns an object representation of the error condition.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `header` | `string` \| [`Headers`](https://developer.mozilla.org/docs/Web/API/Headers) \| [`Response`](https://developer.mozilla.org/docs/Web/API/Response) |

## Returns

[`WWWAuthenticateError`](../interfaces/WWWAuthenticateError.md) \| `null`

## See

* [MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/WWW-Authenticate)
* [RFC 7235 - WWW-Authenticate](https://datatracker.ietf.org/doc/html/rfc7235#section-4.1)
