# OAuth2

OAuth2 is vast, detailed and complex. There will way to distill OAuth2 in a simple `README`. Instead, here is a glossary of common terms used in the context of OAuth2.

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

* **`Authorization Grant:`** The credential representing the resource owner's authorization; used by the client to obtain an access token.
  * **`Authorization Code:`** A temporary code exchanged for an access token (used in Authorization Code Grant flow).
  * **`Redirect URI:`** The URI where the authorization server redirects the user after authorization, often used to deliver authorization codes or tokens.
* **`Implicit Grant:`**<Badge type="danger" text="Deprecated" /> An OAuth2 flow where the access token is returned directly to the client, suitable for public clients like single-page apps.
* **`Client Credentials Grant:`** An OAuth2 flow where the client authenticates using its own credentials, typically for machine-to-machine communication.
* **`Password Grant:`** An OAuth2 flow where the client obtains an access token by directly using the resource owner's username and password.

## OAuth2 Extensions

* **`OpenID Connect (OIDC):`** An identity layer built on top of OAuth2, used to verify a user's identity and obtain basic profile information.
  * **`Single Sign-On (SSO):`** The ability for users to authenticate once and access multiple applications without re-authenticating.
  * **`Single Logout (SLO):`** A mechanism to log the user out of all connected applications and sessions.
  * **`UserInfo Endpoint:`** An API endpoint provided by the IdP that returns additional user profile information.
