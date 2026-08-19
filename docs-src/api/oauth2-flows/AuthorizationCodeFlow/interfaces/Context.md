[@okta/oauth2-flows](../..) / [AuthorizationCodeFlow](../index.md) / [AuthorizationCodeFlow](../index.md) / Context

# Interface: Context

Values needed to initiate an Authorization Code flow

## Extends

- [`AuthContext`](../../types/type-aliases/AuthContext.md)

## Indexable

> \[`key`: `string`\]: `any`

## Properties

### redirectUri

> **redirectUri**: `string`

Where the Authorization Server should redirect back to once the user has authenticated

#### See

[RFC 6749 - Redirection Endpoint](https://datatracker.ietf.org/doc/html/rfc6749#section-3.1.2)

***

### state

> **state**: `string`

A unique value used to correlate the `/authorize` request with its redirect back, mitigating CSRF

#### See

[RFC 6749 - Authorization Request](https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.1)

***

### pkce?

> `optional` **pkce?**: [`Challenge`](/api/auth-foundation)

The [PKCE.Challenge](/api/auth-foundation) sent on the `/authorize` request; deleted from context once used

#### See

[RFC 7636 - Client Creates the Code Challenge](https://datatracker.ietf.org/doc/html/rfc7636#section-4.2)

***

### verifier

> **verifier**: `string`

The PKCE code verifier, exchanged for tokens alongside the authorization code

#### See

[RFC 7636 - Client Creates the Code Verifier](https://datatracker.ietf.org/doc/html/rfc7636#section-4.1)

***

### nonce?

> `optional` **nonce?**: `string`

A random value used to mitigate replay attacks, verified against the resulting ID token's `nonce` claim

#### See

[RFC 9700 - Countermeasures: Nonce](https://datatracker.ietf.org/doc/html/rfc9700#section-4.5.3.2)

***

### maxAge?

> `optional` **maxAge?**: `number`

Maximum elapsed time, in seconds, since the user last authenticated. Often used in step-up authentication flows

#### See

[RFC 9470 - Authentication Requirements Challenge](https://datatracker.ietf.org/doc/html/rfc9470#section-3-5.4)

***

### scopes?

> `optional` **scopes?**: `string`[]

Scopes requested for this specific flow instance

#### See

[RFC 6749 - Access Token Scope](https://datatracker.ietf.org/doc/html/rfc6749#section-3.3)

***

### acrValues?

> `optional` **acrValues?**: [`AcrValues`](/api/auth-foundation)

Requested authentication context class reference values. These values a pre-defined by the authorization server.

#### See

[RFC 9470 - Authentication Requirements Challenge](https://datatracker.ietf.org/doc/html/rfc9470#section-3-5.4)
