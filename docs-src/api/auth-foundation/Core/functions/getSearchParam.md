[@okta/auth-foundation](../..) / [Core](../index.md) / getSearchParam

# Function: getSearchParam()

> **getSearchParam**(`parameters`, `name`): `string` \| `undefined`

Extracts a query parameter from a [URLSearchParams](https://developer.mozilla.org/docs/Web/API/URLSearchParams) instance. Throws when more than one value exists for given parameter
(which is allowed in the URI spec, but is not practiced in OAuth2)

## Parameters

| Parameter | Type |
| ------ | ------ |
| `parameters` | [`URLSearchParams`](https://developer.mozilla.org/docs/Web/API/URLSearchParams) |
| `name` | `string` |

## Returns

`string` \| `undefined`

## Throws

[NetworkError](../classes/NetworkError.md)
