[@okta/auth-foundation](../..) / [Core](../index.md) / IDTokenValidatorContext

# Interface: IDTokenValidatorContext

Contextual data, usually from the `/authorize` request, which resulted in an ID token
needed to validate said `ID Token`

## Properties

### allowHTTP?

> `optional` **allowHTTP?**: `boolean`

***

### nonce?

> `optional` **nonce?**: `string`

***

### maxAge?

> `optional` **maxAge?**: `number`

***

### acrValues?

> `optional` **acrValues?**: [`AcrValues`](../../OAuth2/type-aliases/AcrValues.md)

***

### supportedAlgs?

> `optional` **supportedAlgs?**: `string`[]
