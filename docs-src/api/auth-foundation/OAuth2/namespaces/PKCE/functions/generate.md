[@okta/auth-foundation](../../../..) / [OAuth2](../../../index.md) / [PKCE](../index.md) / generate

# Function: generate()

> **generate**(`method?`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`PKCE`](../../../type-aliases/PKCE.md)\>

Generates a `PKCE` challenge and verifier.

## Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `method` | `string` | `'S256'` |

## Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`PKCE`](../../../type-aliases/PKCE.md)\>

## Remarks

Currently `S256` is the only hashing algorithm available. Per spec, `plain` (unhashed) challenges
are valid for client which are unable to perform `S256`, but this isn't implemented within this client
