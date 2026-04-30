# OAuth2

OAuth2 is vast, detailed and complex. There will way to distill OAuth2 in a simple `README`. Instead, here is a glossary of common terms used in the context of OAuth2.

## References

### OAuth 2.0

* [RFC 6749: The OAuth 2.0 Authorization Framework](https://datatracker.ietf.org/doc/html/rfc6749)
* [RFC 6750: The OAuth 2.0 Authorization Framework: Bearer Token Usage](https://datatracker.ietf.org/doc/html/rfc6750)
* [RFC 8414: OAuth 2.0 Authorization Server Metadata](https://datatracker.ietf.org/doc/html/rfc8414)
* [RFC 8252: OAuth 2.0 for Native Apps](https://datatracker.ietf.org/doc/html/rfc8252)
* [RFC 9207: OAuth 2.0 Authorization Server Issuer Identification](https://datatracker.ietf.org/doc/html/rfc9207)
* [RFC 7636: Proof Key for Code Exchange by OAuth Public Clients (PKCE)](https://datatracker.ietf.org/doc/html/rfc7636)
* [RFC 7009: OAuth 2.0 Token Revocation](https://datatracker.ietf.org/doc/html/rfc7009)
* [RFC 7662: OAuth 2.0 Token Introspection](https://datatracker.ietf.org/doc/html/rfc7662)
* [RFC 9449: OAuth 2.0 Demonstrating Proof of Possession (DPoP)](https://datatracker.ietf.org/doc/html/rfc9449)

#### Guidance

* [RFC 9700: Best Current Practice for OAuth 2.0 Security](https://datatracker.ietf.org/doc/html/rfc9700)
* [RFC 6819: OAuth 2.0 Threat Model and Security Considerations](https://datatracker.ietf.org/doc/html/rfc6819)

### JSON Web Specs

* [RFC 7519: JSON Web Token (JWT)](https://datatracker.ietf.org/doc/html/rfc7519)
* [RFC 7515: JSON Web Signature (JWS)](https://datatracker.ietf.org/doc/html/rfc7515)
* [RFC 7517: JSON Web Key (JWK)](https://datatracker.ietf.org/doc/html/rfc7517)

### OIDC

* [OpenID Connect (OIDC) Spec](https://openid.net/specs/openid-connect-core-1_0.html)
* [OpenID Connect (OIDC) Discovery Spec](https://openid.net/specs/openid-connect-discovery-1_0.html)

### HTTP

* [RFC 7235: Hypertext Transfer Protocol (HTTP/1.1): Authentication](https://datatracker.ietf.org/doc/html/rfc7235)

## Common Terms

* **`Issuer:`** The authorization server (or identity provider) that authenticates users and issues ID tokens.
* **`Scope:`** Specifies the level of access requested by the client, such as read or write permissions for resources.
* **`JWT (JSON Web Token):`** A compact, URL-safe token format often used for access tokens, containing claims about the user and token validity.
* **`Token Expiry:`** The duration after which an access token becomes invalid and must be refreshed or reissued.
* **`Token Revocation:`** The process of invalidating a token before its expiry, preventing further access to resources.
* **`Consent Screen:`** The user interface (UI) presented to the resource owner to approve or deny access requested by the client.
* **`Claims:`** Statements about an entity (usually the user) and additional metadata, typically included in tokens.
* **`State:`** The state parameter is a unique value sent by the client during authentication to prevent cross-site request forgery (CSRF) attacks. When the authorization server returns this value, the client verifies it matches the original, ensuring the response belongs to its own request and maintaining security.
* **`Nonce:`** A random value included in authentication requests to prevent replay attacks.
* **`PKCE (Proof Key for Code Exchange):`** An extension to OAuth2 used to secure public clients in the Authorization Code Grant flow.
* **`DPoP (Demonstration of Proof-of-Possession):`** An extension to OAuth2 and OIDC designed to prevent token replay attacks by binding tokens to a particular client and request.

## Actors

* **`Authorization Server:`** The server that issues access tokens after authenticating and authorizing the client and resource owner.
* **`Resource Server:`** The server that hosts protected resources and validates access tokens to grant access.
* **`Client:`** The application requesting access to protected resources on behalf of the resource owner.
* **`Resource Owner:`** The user or entity who owns the protected resources and grants access to the client.
* **`Relying Party (RP):`** The application (client) that requests authentication and user information from the identity provider.
* **`Identity Provider (IdP):`** The service that authenticates users and provides identity information (often the same as the issuer).

## Tokens

* **`Access Token:`** A credential used by the client to access protected resources; typically short-lived.
* **`ID Token:`** A JWT token issued by the identity provider containing claims about the authenticated user.
* **`Refresh Token:`** A credential used to obtain a new access token without re-authenticating the resource owner; typically long-lived.

## Flows / Grant Types

> [!Tip]
> Despite the section title, these two words aren't quite synonyms. A **grant type** is a formally spec'd mechanism identified by the `grant_type` parameter sent to the token endpoint (e.g. `authorization_code`, `refresh_token`) — it describes the specific thing being redeemed for a token. A **flow** is the broader, end-to-end journey a client and user go through to get there in the first place, including steps that never touch the token endpoint at all (redirects, consent screens, PKCE, device-code polling, etc.).

* **`Authorization Grant:`** The credential representing the resource owner's authorization; used by the client to obtain an access token.
  * **`Authorization Code:`** A temporary code exchanged for an access token (used in Authorization Code Grant flow).
  * **`Redirect URI:`** The URI where the authorization server redirects the user after authorization, often used to deliver authorization codes or tokens.
* **`Implicit Grant:`**<Badge type="danger" text="Deprecated" /> An OAuth2 flow where the access token is returned directly to the client, suitable for public clients like single-page apps.
* **`Client Credentials Grant:`** An OAuth2 flow where the client authenticates using its own credentials, typically for machine-to-machine communication.
* **`Password Grant:`** An OAuth2 flow where the client obtains an access token by directly using the resource owner's username and password.

## OAuth2 Extensions

* **`OpenID Connect (OIDC):`** An identity layer built on top of OAuth2, used to verify a user's identity and obtain basic profile information.
  * **`Single Sign-On (SSO):`** The ability for users to authenticate once and access multiple applications without re-authenticating.
  * **`Single Logout (SLO):`** A mechanism to log the user out of all connected applications and sessions. See [RP-Initiated Logout](/docs/references/session_logout_flow) for how this SDK implements it.
  * **`UserInfo Endpoint:`** An API endpoint provided by the IdP that returns additional user profile information.
