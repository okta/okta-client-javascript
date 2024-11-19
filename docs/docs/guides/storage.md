---
id: "storage"
title: "Choosing Storage"
sidebar_label: "Choosing Storage"
custom_edit_url: null
---

> Start here: [Token Storage](https://auth0.com/docs/secure/security-guidance/data-security/token-storage#web-storage-local-storage-session-storage-)

## Default StorageProvider

The default configuration for `storageTypes` is `['memory']`. This means, by default, credentials will be stored in memory, with no fallback provider (because in memory storage cannot fail). This is the default because in memory storage is the most secure.

## Security vs User Experience

In memory storage may be the most secure, however it has some significant limitations. In memory storage is only availble in the currently executing JavaScript context, meaning it does not survive
page refresh or exist in new tabs. This means a user of your application will need to authenticate (and persuambly enter their credentials) on every fresh page load, resulting in a poor user experience

## Persistent Storage

> When this section refers to `cookies`, it means cookies _WITHOUT_ `httpOnly`

Persistent storage, like `localStorage` or `cookies`, solve the page refresh and browser tab problems, however they are more vulnerable to XSS attacks. To reduce risk, it's recommended to set your token expiration to `5 minutes` when using persistent storage. Most SPA applications will want to use a persistent storage solution as it provides the best user experience.

## Recommended Configuration

It's recommended to set `storageTypes` to `['localStorage', 'cookie', 'memory']`.

This configuration defaults storage to `localStorage`, falling back to `cookie` if `localStorage` is not available, ultimately falling back to `memory`. This configuration will provide the best user experience, assuming the risk of XSS attacks is acceptable for your use case.

TODO: discuss mitigating XSS risk

## Alternatives

### Store tokens on server

If you feel the risk of persistent storage is too great, but desired the UX it provides, you may want to consider a Web Application rather than a SPA. Rather than storing tokens within your SPA application (on the user's browser), establish a traditional session between your client and server and use the sessionID to look up the token(s) stored on your server. This solution isn't has flexible or convenient as client-side (browser) storage, however it will be more secure.

### Multi Token
Another option is to use multiple tokens. For example: A "default credential" represents a user's profile and grants read access. If the user wishes to update their profile, they will be required to re-authenticate and will be issued a 2nd token which will be revoked immediately after the update operation (since it's one-time-use, there is no reason to store the 2nd token). This will not reduce the likelihood the "default credential" will be compromised, but will reduce an attacker's capabilities.

### Implement Custom StorageProvider
A custom storage implementation (which implements the StorageProvider interface) can be used.


## Additional Resources
* https://auth0.com/docs/secure/security-guidance/data-security/token-storage#web-storage-local-storage-session-storage-
* https://auth0.com/blog/secure-browser-storage-the-facts/
* https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html