# Changelog

All notable changes to this project will be documented in this file.

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