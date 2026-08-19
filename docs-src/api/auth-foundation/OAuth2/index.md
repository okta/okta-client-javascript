[@okta/auth-foundation](..) / OAuth2

# OAuth2

## DPoP

Defined in [RFC 9449](https://datatracker.ietf.org/doc/html/rfc9449), Demonstrating Proof of Possession (DPoP)
is a **significant** security improvement which binds OAuth2 tokens to a private/public key pair. The private key is only
accessible to the requesting client. Any resource server (or `refresh_token` grant) requests made with bound tokens are
required to be signed by the private key. Any requests which attempt to use bound tokens without a valid signature will be
rejected. This results in a significantly improved security posture against token theft-based attacks, as tokens are nearly
useless without access to the private key they are bound to.

| Interface | Description |
| ------ | ------ |
| [DPoPSigningAuthority](interfaces/DPoPSigningAuthority.md) | A Platform-level singleton for performing `DPoP` operations. The [DPoPSigningAuthority](interfaces/DPoPSigningAuthority.md) is reasonable for mangaging `DPoP` key pairs and generate `DPoP` proofs for outgoing [Request](https://developer.mozilla.org/docs/Web/API/Request)s |
| [DPoPNonceCache](interfaces/DPoPNonceCache.md) | > The intent is that clients need to keep only one nonce value and servers need to keep a window of recent nonces. |
| [DPoPStorage](interfaces/DPoPStorage.md) | A simple storage interface for `DPoP` key pairs |
| [DPoPClaims](interfaces/DPoPClaims.md) | `JWT` claims associated with a `DPoP` proof |
| [DPoPHeaders](interfaces/DPoPHeaders.md) | `JWT` header parameters for a `DPoP` proof |
| [DPoPProofParams](interfaces/DPoPProofParams.md) | Parameters required to generate a `DPoP` proof |

## Interfaces

| Interface | Description |
| ------ | ------ |
| [APIClientConfiguration](interfaces/APIClientConfiguration.md) | - |
| [OpenIdConfiguration](interfaces/OpenIdConfiguration.md) | Interface defining the response payload from `/.well-known/openid-configuration` |

## OAuth2Client

| Name | Description |
| ------ | ------ |
| [OAuth2Request](OAuth2Request/index.md) | A builder class for [Request](https://developer.mozilla.org/docs/Web/API/Request) instances representing a OAuth2 endpoint request |
| [OAuth2Request](OAuth2Request/index.md) | - |
| [OAuth2Client](OAuth2Client/index.md) | - |
| [OAuth2Client](OAuth2Client/index.md) | - |
| [OAuth2ClientOptions](type-aliases/OAuth2ClientOptions.md) | Configuration options for [OAuth2Client](OAuth2Client/index.md) |
| [ConfigurationParams](interfaces/ConfigurationParams.md) | Options to provide to [Configuration](classes/Configuration.md) at instantiation |
| [Configuration](classes/Configuration.md) | Options to customize the behavior of a [OAuth2Client](OAuth2Client/index.md) instance |

## PKCE

Defined in [RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636), Proof Key for Code Exchange (PKCE) helps protect
authorization codes (returned as the query paramter `code`) when performing `Authorization Code Flow`. 
The client generates a cryptographically-random string and hashes it (the challenge). Both the challenge andhashing algorithm are 
provided to the authorization server as parameters to `/authorize`. When the client receives the `code` from the authorization server, 
it must provide a `code_verifier`, the orginial pre-hashed string when the `code` is exchanged for tokens. The token exchange will fail 
if an incorrect verifier is provided.

| Name | Description |
| ------ | ------ |
| [PKCE](type-aliases/PKCE.md) | Defines the properties returned by [PKCE.generate](namespaces/PKCE/functions/generate.md) |
| [PKCE](namespaces/PKCE/index.md) | - |

## Types

| Name | Description |
| ------ | ------ |
| [OAuth2ErrorResponse](interfaces/OAuth2ErrorResponse.md) | JSON format of an error response returned by authorization server |
| [isOAuth2ErrorResponse](functions/isOAuth2ErrorResponse.md) | Predicate for [OAuth2ErrorResponse](interfaces/OAuth2ErrorResponse.md) |
| [isOpenIdConfiguration](functions/isOpenIdConfiguration.md) | Type predicate for [OpenIdConfiguration](interfaces/OpenIdConfiguration.md) |
| [isJWK](functions/isJWK.md) | Type predicate for [JWK](../Core/interfaces/JWK.md) |
| [isJWKS](functions/isJWKS.md) | Type predicate for [JWKS](../Core/type-aliases/JWKS.md) |
| [OAuth2Params](type-aliases/OAuth2Params.md) | Parameters needed to define an OAuth2 flow |
| [GrantType](type-aliases/GrantType.md) | Possible values of `grant_type` for a `/token` request |
| [TokenType](type-aliases/TokenType.md) | Possible values of `token_type` from a `/token` response |
| [ClientAuthentication](type-aliases/ClientAuthentication.md) | Possible values of [OAuth2.Configuration.authentication](classes/Configuration.md#authentication) property. Determines how the [OAuth2Client](OAuth2Client/index.md) will sign OAuth2 requests |
| [AcrValues](type-aliases/AcrValues.md) | Possible types of `acr_values` for OAuth2 requests |
| [OktaAcrValues](type-aliases/OktaAcrValues.md) | Possible `acr_values` of Okta authorization servers |
