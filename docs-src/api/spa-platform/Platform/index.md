[@okta/spa-platform](..) / Platform

# Platform

> [!Tip]
> See [Platform](/api/auth-foundation/Platform/) explanation first.

Provides browser-specific default implementations of
[PlatformDependencies](/api/auth-foundation/Platform/interfaces/PlatformDependencies/)

## See

[SPA Platform: Platform](/api/spa-platform/#platform)

## Credential

| Class | Description |
| ------ | ------ |
| [Credential](classes/Credential.md) | A browser-specific extension of `@okta/auth-foundation` [Credential](/api/auth-foundation/Credential/) |

## Functions

| Function | Description |
| ------ | ------ |
| [clearDPoPKeyPairs](functions/clearDPoPKeyPairs.md) | Clears all DPoP public / private key pairs from storage |
| [isModernBrowser](functions/isModernBrowser.md) | Verifies the browser supports all features this library depends on |

## Variables

| Variable | Description |
| ------ | ------ |
| [PlatformDefaults](variables/PlatformDefaults.md) | [PlatformDependencies](/api/auth-foundation/Platform/interfaces/PlatformDependencies/) implementations designed for browsers |
