[@okta/oauth2-flows](../..) / [AuthorizationCodeFlow](../index.md) / [AuthorizationCodeFlow](../index.md) / InitOptions

# Interface: InitOptions

Options required to construct a [AuthorizationCodeFlow](../index.md) instance

## Properties

### issuer

> **issuer**: `string` \| [`URL`](https://developer.mozilla.org/docs/Web/API/URL)

The Authorization Server's base URL

***

### clientId

> **clientId**: `string`

The `client_id` registered with the [issuer](../../Core/AuthenticationFlow/interfaces/Options.md#issuer)

***

### scopes

> **scopes**: `string` \| `string`[]

Scopes to request, either space-delimited or as an array of individual scope strings

***

### dpop?

> `optional` **dpop?**: `boolean`

Whether the flow's underlying [OAuth2Client](/api/auth-foundation/OAuth2/OAuth2Client/) should request DPoP-bound tokens

***

### redirectUri

> **redirectUri**: `string` \| [`URL`](https://developer.mozilla.org/docs/Web/API/URL)

Where the Authorization Server should redirect back to once the user has authenticated

***

### additionalParameters?

> `optional` **additionalParameters?**: [`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)\<`string`, `string`\>

Additional query parameters to include on every `/authorize` request made by this flow
