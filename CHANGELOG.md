# Changelog

All notable changes to this project will be documented in this file.

## [0.9.0] - 2026-09-21

### `@okta/auth-foundation`

#### Added
- Added `Configuration.getOptions()` to `OAuth2Client.Configuration`, returning the client's `authentication`, `allowHTTP`, and `syncClockWithAuthorizationServer` settings ([#35](https://github.com/okta/okta-client-javascript/pull/35))
- Added `allowHTTP` to `IDTokenValidatorContext`, allowing ID token issuer-scheme validation to be skipped on a per-call basis ([#35](https://github.com/okta/okta-client-javascript/pull/35))
- Added `TokenStorage.loadDefaultTokenId()` to explicitly (re)query storage for the default token id ([#35](https://github.com/okta/okta-client-javascript/pull/35))
- Added `jku`, `x5u`, `x5t`, and `x5c` to `JWTHeader`, and `use` to `JWK` ([#35](https://github.com/okta/okta-client-javascript/pull/35))

#### Changed
- **Breaking:** `TokenStorage` implementations must now implement `loadDefaultTokenId(): Promise<string | null>`, and `defaultTokenId` may be `undefined` (not yet loaded from storage) in addition to `string | null` ([#35](https://github.com/okta/okta-client-javascript/pull/35))

#### Fixed
- Fixed `allowHTTP: true` on `OAuth2Client.Configuration` not being honored during ID token validation, causing `http://` issuers to fail even when explicitly allowed ([#35](https://github.com/okta/okta-client-javascript/pull/35))
- Fixed `OAuth2Client` instances reconstructed from stored tokens (e.g. via `Credential.find`) losing the original client's `authentication`/`allowHTTP`/`syncClockWithAuthorizationServer` settings ([#35](https://github.com/okta/okta-client-javascript/pull/35))

### `@okta/oauth2-flows`

### Added
- adds `ResourceOwnerFlow` (for Native clients) ([#48](https://github.com/okta/okta-client-javascript/pull/48))

#### Changed
- **Breaking:** `AuthorizationCodeFlow.resume()` now requires an explicit `redirectUri` (`string | URL | URLSearchParams`) and no longer falls back to `window.location.href` ([#35](https://github.com/okta/okta-client-javascript/pull/35))

### `@okta/react-native-platform`

Initial beta release for React Native. See the [docs](https://okta.github.io/okta-client-javascript/api/react-native-platform/) for more details.

### `@okta/react-native-webcrypto-bridge`

Initial beta release, providing a native WebCrypto implementation for React Native.

## [0.8.0] - 2026-09-15

### `@okta/auth-foundation`

#### Added
- Added `dispose()` to `Credential`, `OAuth2Client`, and `APIClient` to release listeners and cached resources when a credential is removed ([#39](https://github.com/okta/okta-client-javascript/pull/39))
- Added an optional `{ signal: AbortSignal }` option to `EventEmitter.on()`, and a `clear()` method, for automatic listener cleanup ([#39](https://github.com/okta/okta-client-javascript/pull/39))

#### Fixed
- Fixed a memory leak where every constructed `Credential` added a listener to the shared `CredentialCoordinator` emitter that was never removed, retaining every `Credential` (and its `OAuth2Client`) for the lifetime of the page ([#39](https://github.com/okta/okta-client-javascript/pull/39))
- `DefaultCredentialDataSource.remove()`/`.clear()` now dispose removed credentials instead of only removing them from the internal cache ([#39](https://github.com/okta/okta-client-javascript/pull/39))

### `@okta/spa-platform`

#### Fixed
- Cross-tab credential sync no longer broadcasts full token payloads over `BroadcastChannel`; tabs now read the current value from storage, and only when they already reference the credential in question, reducing memory pressure across many open tabs ([#39](https://github.com/okta/okta-client-javascript/pull/39))
- `IndexedDBStore` CRUD operations now resolve on `transaction.oncomplete` rather than `request.onsucces` ([#40](https://github.com/okta/okta-client-javascript/pull/40))

## [0.7.2] - 2026-04-09

### `@okta/spa-platform`

#### Fixed
- Fixes package exports to ensure `@okta/oauth2-flows` is truly an _optional_ dependency ([#28](https://github.com/okta/okta-client-javascript/pull/28))

## [0.7.1] - 2026-04-06

### `@okta/auth-foundation`

#### Added
- Added `invalidateToken` abstract method to `TokenOrchestrator` ([#26](https://github.com/okta/okta-client-javascript/pull/26))

#### Fixed
- `FetchClient` will now remove tokens when `401` is received (via `invalidateToken`) ([#26](https://github.com/okta/okta-client-javascript/pull/26))

### `@okta/spa-platform`

#### Added
- Implements `invalidateToken` within `HostOrchestrator` and `AuthorizationCodeFlowOrchestrator` ([#26](https://github.com/okta/okta-client-javascript/pull/26))

## [0.7.0] - 2026-03-19

### `@okta/auth-foundation`

#### Added
- Warnings for mismatched `TaskBridge` message versions ([#21](https://github.com/okta/okta-client-javascript/pull/21))

## [0.6.0] - 2026-03-18

### `@okta/auth-foundation`

#### Added
- Clock synchronization with Authorization Server ([#16](https://github.com/okta/okta-client-javascript/pull/16))

#### Changed
- Refactored to `PlatformRegistry` pattern ([#18](https://github.com/okta/okta-client-javascript/pull/18))

### `@okta/oauth2-flows`

#### Changed
- Refactored to `PlatformRegistry` pattern ([#18](https://github.com/okta/okta-client-javascript/pull/18))

### `@okta/spa-platform`

#### Changed
- Refactored to `PlatformRegistry` pattern ([#18](https://github.com/okta/okta-client-javascript/pull/18))

## [0.5.4] - 2025-12-09

### `@okta/auth-foundation`

#### Fixed
- Improved `EventEmitter` typing within abstract classes ([#12](https://github.com/okta/okta-client-javascript/pull/12))

### `@okta/oauth2-flows`

#### Fixed
- Improved `EventEmitter` typing within abstract classes ([#12](https://github.com/okta/okta-client-javascript/pull/12))

### `@okta/spa-platform`

#### Fixed
- Improved `EventEmitter` typing within abstract classes ([#12](https://github.com/okta/okta-client-javascript/pull/12))

## [0.5.3] - 2025-12-05

### `@okta/auth-foundation`

#### Added
- Adds object hashing function to produce predictable cache keys ([#11](https://github.com/okta/okta-client-javascript/pull/11))

### `@okta/oauth2-flows`

#### Fixed
- Added context to errors thrown in `AuthorizationCodeFlow` ([#9](https://github.com/okta/okta-client-javascript/pull/9))
- Fixed `Token.Metadata` handling in `TokenStorage` ([#10](https://github.com/okta/okta-client-javascript/pull/10))

### `@okta/spa-platform`

#### Fixed
- Improved local cache in `HostOrchestrator.SubApp` ([#11](https://github.com/okta/okta-client-javascript/pull/11))

## [0.5.2] - 2025-11-25

### `@okta/auth-foundation`

#### Added
- Adds defaults to Configuration classes ([#8](https://github.com/okta/okta-client-javascript/pull/8))

#### Fixed
- `APIClient` improvements ([#7](https://github.com/okta/okta-client-javascript/pull/7))

## [0.5.1] - 2025-11-12

### `@okta/auth-foundation`

#### Added
- Adds `TaskBridge` (bi-directional messaging) class ([#4](https://github.com/okta/okta-client-javascript/pull/4))

#### Fixed
- Upgraded TypeScript target to `es2022` ([#2](https://github.com/okta/okta-client-javascript/pull/2))

### `@okta/oauth2-flows`

#### Added
- Adds `LogoutFlow` abstract class ([#1](https://github.com/okta/okta-client-javascript/pull/1))

#### Fixed
- Upgraded TypeScript target to `es2022` ([#2](https://github.com/okta/okta-client-javascript/pull/2))

### `@okta/spa-platform`

#### Added
- Adds POST submit for /logout endpoint ([#1](https://github.com/okta/okta-client-javascript/pull/1))

#### Fixed
- Refactors `HostOrchestrator` to utilize `TaskBridge` ([#4](https://github.com/okta/okta-client-javascript/pull/4))
- Upgraded TypeScript target to `es2022` ([#2](https://github.com/okta/okta-client-javascript/pull/2))