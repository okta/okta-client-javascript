[@okta/spa-platform](../../..) / [Flows](../../index.md) / [AuthorizationCodeFlow](../index.md) / RedirectValues

# Interface: RedirectValues

Values parsed from a successful redirect back from the Authorization Server

## Properties

### code

> **code**: `string`

The authorization code to be exchanged for tokens.

#### See

[RFC 6749 - Authorization Response](https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.2)

***

### state

> **state**: `string`

A unique value used to correlate the `/authorize` request with its redirect back, mitigating CSRF

#### See

[RFC 6749 - Authorization Request](https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.1)
