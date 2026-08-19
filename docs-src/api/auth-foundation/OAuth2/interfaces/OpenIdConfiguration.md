[@okta/auth-foundation](../..) / [OAuth2](../index.md) / OpenIdConfiguration

# Interface: OpenIdConfiguration

Interface defining the response payload from `/.well-known/openid-configuration`

## See

* [OIDC Discovery 1.0 - Provider Metadata](https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderMetadata)

## Properties

### issuer

> `readonly` **issuer**: `string`

URL of the authorization server.

***

### authorization\_endpoint?

> `readonly` `optional` **authorization\_endpoint?**: `string`

URL of the authorization server's authorization endpoint.

***

### token\_endpoint?

> `readonly` `optional` **token\_endpoint?**: `string`

URL of the authorization server's token endpoint.

***

### jwks\_uri?

> `readonly` `optional` **jwks\_uri?**: `string`

URL of the authorization server's JWK Set document.

***

### userinfo\_endpoint?

> `readonly` `optional` **userinfo\_endpoint?**: `string`

URL of the authorization server's UserInfo endpoint.

***

### registration\_endpoint?

> `readonly` `optional` **registration\_endpoint?**: `string`

URL of the authorization server's Dynamic Client Registration endpoint.

***

### introspection\_endpoint?

> `readonly` `optional` **introspection\_endpoint?**: `string`

URL of the authorization server's introspection endpoint.

#### See

[RFC 7662 - OAuth 2.0 Token Introspection](https://datatracker.ietf.org/doc/html/rfc7662)

***

### introspection\_endpoint\_auth\_methods\_supported?

> `readonly` `optional` **introspection\_endpoint\_auth\_methods\_supported?**: `string`[]

`token_endpoint_auth_methods_supported` values accepted by [OpenIdConfiguration.introspection\_endpoint](#introspection-endpoint)

***

### revocation\_endpoint?

> `readonly` `optional` **revocation\_endpoint?**: `string`

URL of the authorization server's token revocation endpoint.

#### See

[RFC 7009 - OAuth 2.0 Token Revocation](https://datatracker.ietf.org/doc/html/rfc7009)

***

### revocation\_endpoint\_auth\_methods\_supported?

> `readonly` `optional` **revocation\_endpoint\_auth\_methods\_supported?**: `string`[]

`token_endpoint_auth_methods_supported` values accepted by [OpenIdConfiguration.revocation\_endpoint](#revocation-endpoint)

***

### end\_session\_endpoint?

> `readonly` `optional` **end\_session\_endpoint?**: `string`

URL of the authorization server's RP-Initiated Logout endpoint.

#### See

[OIDC RP-Initiated Logout 1.0](https://openid.net/specs/openid-connect-rpinitiated-1_0.html)

***

### device\_authorization\_endpoint?

> `readonly` `optional` **device\_authorization\_endpoint?**: `string`

URL of the authorization server's Device Authorization endpoint.

#### See

[RFC 8628 - OAuth 2.0 Device Authorization Grant](https://datatracker.ietf.org/doc/html/rfc8628)

***

### pushed\_authorization\_request\_endpoint?

> `readonly` `optional` **pushed\_authorization\_request\_endpoint?**: `string`

URL of the authorization server's Pushed Authorization Request endpoint.

#### See

[RFC 9126 - OAuth 2.0 Pushed Authorization Requests](https://datatracker.ietf.org/doc/html/rfc9126)

***

### response\_types\_supported?

> `readonly` `optional` **response\_types\_supported?**: `string`[]

`response_type` values this authorization server supports

***

### response\_modes\_supported?

> `readonly` `optional` **response\_modes\_supported?**: `string`[]

`response_mode` values this authorization server supports

***

### grant\_types\_supported?

> `readonly` `optional` **grant\_types\_supported?**: `string`[]

`grant_type` values this authorization server supports

***

### subject\_types\_supported?

> `readonly` `optional` **subject\_types\_supported?**: `string`[]

Subject Identifier types this authorization server supports, e.g. `pairwise` or `public`

***

### id\_token\_signing\_alg\_values\_supported?

> `readonly` `optional` **id\_token\_signing\_alg\_values\_supported?**: `string`[]

JWS `alg` values supported for signing ID Tokens

***

### id\_token\_encryption\_alg\_values\_supported?

> `readonly` `optional` **id\_token\_encryption\_alg\_values\_supported?**: `string`[]

JWE `alg` values supported for encrypting ID Tokens

***

### id\_token\_encryption\_enc\_values\_supported?

> `readonly` `optional` **id\_token\_encryption\_enc\_values\_supported?**: `string`[]

JWE `enc` values supported for encrypting ID Tokens

***

### scopes\_supported?

> `readonly` `optional` **scopes\_supported?**: `string`[]

OAuth2 `scope` values this authorization server supports

***

### token\_endpoint\_auth\_methods\_supported?

> `readonly` `optional` **token\_endpoint\_auth\_methods\_supported?**: `string`[]

Client authentication methods supported by [OpenIdConfiguration.token\_endpoint](#token-endpoint)

***

### claims\_supported?

> `readonly` `optional` **claims\_supported?**: `string`[]

Claim names the authorization server may include in an ID Token or from the [OpenIdConfiguration.userinfo\_endpoint](#userinfo-endpoint)

***

### code\_challenge\_methods\_supported?

> `readonly` `optional` **code\_challenge\_methods\_supported?**: `string`[]

PKCE `code_challenge_method` values this authorization server supports

#### See

[RFC 7636 - Proof Key for Code Exchange (PKCE)](https://datatracker.ietf.org/doc/html/rfc7636)

***

### request\_parameter\_supported?

> `readonly` `optional` **request\_parameter\_supported?**: `boolean`

Whether this authorization server supports use of the `request` parameter

***

### request\_object\_signing\_alg\_values\_supported?

> `readonly` `optional` **request\_object\_signing\_alg\_values\_supported?**: `string`[]

JWS `alg` values supported for signing a JWT-encoded `request` parameter object

***

### backchannel\_token\_delivery\_modes\_supported?

> `readonly` `optional` **backchannel\_token\_delivery\_modes\_supported?**: `string`[]

Delivery modes this authorization server supports for CIBA

#### See

[OIDC CIBA Core 1.0](https://openid.net/specs/openid-client-initiated-backchannel-authentication-core-1_0.html)

***

### backchannel\_authentication\_request\_signing\_alg\_values\_supported?

> `readonly` `optional` **backchannel\_authentication\_request\_signing\_alg\_values\_supported?**: `string`[]

JWS `alg` values supported for signing CIBA authentication request objects

***

### dpop\_signing\_alg\_values\_supported?

> `readonly` `optional` **dpop\_signing\_alg\_values\_supported?**: `string`[]

JWS `alg` values supported for DPoP proof JWTs

#### See

[RFC 9449 - OAuth 2.0 Demonstrating Proof of Possession (DPoP)](https://datatracker.ietf.org/doc/html/rfc9449)
