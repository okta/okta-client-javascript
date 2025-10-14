---
next:
  text: Managing User Credentials
  link: /docs/guides/Credential
---

# Sessions

Traditional cookie-based sessions and OAuth2 token-based sessions differ fundamentally in how they manage user authentication and state. It's important to understand these differences and how they may affect your application and overall architecture. While cookie-based sessions are common in traditional web applications, OAuth2 token-based sessions are preferred for APIs and mobile apps due to their statelessness, scalability, and flexible security features.

## Cookie-based Sessions

In a cookie-based session, after a user successfully authenticates, the server creates a session and stores user information on the server side. The client receives a session ID, which is stored as a cookie and sent with every subsequent request, allowing the server to identify the user and retrieve their session data. Sessions commonly have an expiration time (usually 24 hours or less); the session is considered terminated when either:
1. The cookie is deleted from the browser, or
2. The user's information is removed from the server-side session store.

## OAuth2 Token-based Sessions

In contrast, with OAuth2 token-based authentication, after a user successfully authenticates, the `Authorization Server` issues two types of tokens: access tokens and refresh tokens. The access token is a short-lived credential (often a JSON Web Token, or `JWT`) that grants the client permission to access protected resources or APIs on behalf of the user. This token is typically included in the `Authorization` header of each request to the server, and it contains encoded information such as user identity, scopes (permissions), and an expiration timestamp. Because access tokens are short-lived, they minimize security risks if intercepted.

However, to avoid forcing users to re-authenticate frequently when an access token expires, OAuth2 introduces the refresh token. The refresh token is a long-lived credential issued alongside the access token, but unlike the access token, it is only sent to the authentication server and never exposed to resource servers or APIs. When the access token expires, the client can use the refresh token to request a new access token without needing the user to log in again. This process allows for seamless, uninterrupted user sessions while maintaining security, as refresh tokens can be revoked or rotated if compromise is suspected. In summary, access tokens are used for accessing resources and expire quickly for security, while refresh tokens are used to obtain new access tokens and support long-lived, stateless sessions in OAuth2 systems.

This is an important distinction. The access token represents the user's proof of authentication (similar to a session cookie), however the refresh token represents the activeness of the user's session (similar to a server-side session store). A session can be considered active until the refresh token expires, since access tokens can be easily replaced without prompting the user.

### Terminating Token-based Sessions

Resource servers have a few options to validate access tokens from incoming requests.

1. Access tokens issued by Okta Custom Authorization Servers are `JWTs`. The signature of the `JWT` can be verified, ensuring the token's validity. Once the `JWT` is determined to have a valid signature, the expiration date should be checked as well.
    * This approach is decentralized, meaning the resource server can verify the `JWT` itself (with access to the corresponding public key).
    * This approach __DOES NOT__ handle revoked tokens. An unexpired but revoked token will still pass this verification.
    > [!TIP]
    > This approach only works with Okta [Custom Authorization Servers](https://developer.okta.com/docs/concepts/auth-servers/#custom-authorization-server)
2. An `OAuth2` [`introspect`](https://developer.okta.com/docs/api/openapi/okta-oauth/oauth/tag/OrgAS/#tag/OrgAS/operation/introspect) request can be made to obtain the validity of a token. A `JSON` payload with the token's claims will be returned. In addition, the `active` (`boolean`) property will indicate if the token is still active (not revoked or expired).
    * While this approach handles revoked tokens, it's significantly more expensive since it requires a network request per access token.