[@okta/oauth2-flows](../../..) / [Core](../../index.md) / [AuthenticationFlow](../index.md) / Options

# Interface: Options

Options common to every [AuthenticationFlow](../index.md) implementation

## See

[OAuth2Client.ConfigurationParams](/api/auth-foundation/OAuth2/interfaces/ConfigurationParams)

## Properties

### issuer

> **issuer**: `string` \| [`URL`](https://developer.mozilla.org/docs/Web/API/URL)

The Authorization Server's base URL

***

### clientId

> **clientId**: `string`

The `client_id` registered with the [issuer](#issuer)

***

### scopes

> **scopes**: `string` \| `string`[]

Scopes to request, either space-delimited or as an array of individual scope strings

***

### dpop?

> `optional` **dpop?**: `boolean`

Whether the flow's underlying [OAuth2Client](/api/auth-foundation/OAuth2/OAuth2Client/) should request DPoP-bound tokens
