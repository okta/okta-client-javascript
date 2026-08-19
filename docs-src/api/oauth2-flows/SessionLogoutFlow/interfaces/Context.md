[@okta/oauth2-flows](../..) / [SessionLogoutFlow](../index.md) / [SessionLogoutFlow](../index.md) / Context

# Interface: Context

Values needed to initiate a session logout

## See

[OIDC: RP-Initiated Logout](https://openid.net/specs/openid-connect-rpinitiated-1_0.html#RPLogout)

## Extends

- [`AuthContext`](../../types/type-aliases/AuthContext.md)

## Indexable

> \[`key`: `string`\]: `any`

## Properties

### idToken

> **idToken**: `string`

The ID token to be passed as `id_token_hint`

#### See

[OIDC: RP-Initiated Logout](https://openid.net/specs/openid-connect-rpinitiated-1_0.html#RPLogout)

***

### state

> **state**: `string`

A unique value used to correlate the `/logout` request with its redirect back

#### See

[OIDC: RP-Initiated Logout](https://openid.net/specs/openid-connect-rpinitiated-1_0.html#RPLogout)

***

### logoutUrl?

> `optional` **logoutUrl?**: `string`

The resolved `/logout` URL; set once [SessionLogoutFlow.start](../index.md#start) builds it

#### See

[OIDC: RP-Initiated Logout](https://openid.net/specs/openid-connect-rpinitiated-1_0.html#RPLogout)
