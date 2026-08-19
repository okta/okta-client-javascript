[@okta/auth-foundation](..) / Networking

# Networking

## Classes

| Class | Description |
| ------ | ------ |
| [APIClient](APIClient/index.md) | Generic HTTP client with built in request retry |
| [APIRequest](classes/APIRequest.md) | An extension of [Request](https://developer.mozilla.org/docs/Web/API/Request) to be used within [APIClient](APIClient/index.md). |

## Namespaces

| Namespace | Description |
| ------ | ------ |
| [APIClient](APIClient/index.md) | - |

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [APIRequestInit](type-aliases/APIRequestInit.md) | Properties requried to construct an instance of [APIRequest](classes/APIRequest.md) |

## WWWAuthenticate

A collection of utilities for parsing `www-autheticate` headers
* [MDN - WWW-Authenticate](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/WWW-Authenticate)
* [RFC 7235 - WWW-Authenticate](https://datatracker.ietf.org/doc/html/rfc7235#section-4.1)

| Name | Description |
| ------ | ------ |
| [WWWAuthenticateError](interfaces/WWWAuthenticateError.md) | Object representiation of a parsed `www-authenticate` header |
| [isWWWAuthenticateError](functions/isWWWAuthenticateError.md) | Type predicate for [WWWAuthenticateError](interfaces/WWWAuthenticateError.md) |
| [parse](functions/parse.md) | Parses a `www-authenticate` header and returns an object representation of the error condition. |
| [getHeader](functions/getHeader.md) | Returns string value of a `www-authenticate` header. |
