# @okta/auth-foundation

Foundational library for the Okta Client JavaScript ecosystem. Contains base classes and interfaces as well as default implementations.

It's very unlikely Application developers will want to use this library directly. Instead reach for a Platform library like `@okta/spa-platform` or `@okta/react-native-platform`. All Platform libraries re-export the contents of this library (and make platform-specific overrides as needed)

Many default interface implementations provided in this library are in-memory based and are not suitable for production use (e.g. `DefaultTokenStorage`, and the default `DPoPSigningAuthority`/`DPoPNonceCache` registered via `Platform`). These implementations are replaced automatically in Platform libraries.

## Requirements

This library depends on the [`WebCrypto API`](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) which is supported by modern browsers and NodeJS 20+

## Installation

```sh
yarn add @okta/auth-foundation
```

## Entry Points

```ts
// default: core + registers in-memory Platform defaults (see below)
import { ... } from '@okta/auth-foundation'

// core: everything else, without registering any Platform defaults
import { ... } from '@okta/auth-foundation/core'

// internal: implementation details used by Platform libraries to build their own entry points
import { ... } from '@okta/auth-foundation/internal'
```

(Recommended for most usage) Importing `@okta/auth-foundation` has the side effect of calling
`Platform.registerDefaultsLoader()` with this library's own (in-memory, non-production)
implementations of `TimeCoordinator`, `DPoPSigningAuthority`, and `DPoPNonceCache` — see
[Platform](#platform) below. This is what lets `@okta/auth-foundation` work standalone, with no
Platform library installed, at the cost of including those default implementations in your bundle
even if a Platform library goes on to replace them.

`@okta/auth-foundation/core` is everything else — every class, type, and utility this library
exports — *without* that registration side effect. Reach for it when you don't want (or need) the
default `Platform` implementations bundled at all. A good example is a Node.js server that only
needs to inspect a token, not sign or refresh one:

```ts
// resource-server middleware — only decodes an incoming DPoP proof JWT, never
// signs anything itself, so there's no need for a registered Platform at all
import { JWT } from '@okta/auth-foundation/core';

const jwt = new JWT(request.headers.dpop as string);
if (jwt.payload?.nonce === undefined) {
  // ...
}
```

`@okta/auth-foundation/internal` exposes lower-level pieces (like the raw `PlatformDefaults`
object) that Platform libraries use to assemble their *own* `/core`+defaults entry points. As an
Application developer you should not need this export directly — reach for `@okta/spa-platform`
or `@okta/react-native-platform` instead, which already do this wiring for you.

## Platform

`Platform` (a `PlatformRegistry` instance) is this SDK's seam for runtime-specific dependencies
that can't have one single implementation across every JS environment this library runs in
(browser, React Native, Node, ...): `TimeCoordinator`, `DPoPSigningAuthority`, and
`DPoPNonceCache`. Every part of the SDK reads these three dependencies through `Platform` rather
than constructing them directly, so overriding one is a single, centralized change instead of a
hunt through the codebase.

```ts
import { Platform } from '@okta/auth-foundation';

Platform.TimeCoordinator;
Platform.DPoPSigningAuthority;
Platform.DPoPNonceCache;
```

Not all three are equally "in need of" a platform-specific implementation:

- `TimeCoordinator` is genuinely platform-agnostic — this library's own default implementation is
  reused as-is by every Platform library.
- `DPoPSigningAuthority` and `DPoPNonceCache` default to in-memory implementations that are
  **not** suitable for production. Platform libraries (`@okta/spa-platform`,
  `@okta/react-native-platform`) replace these with implementations backed by real platform
  storage/crypto APIs.

> [!NOTE]
> `TokenStorage` (used by `Credential`) is a separate customization point, swapped out via
> `Credential.coordinator.tokenStorage` — see the Platform library READMEs (e.g.
> `@okta/spa-platform`'s `BrowserTokenStorage`) for details. It is not part of `PlatformRegistry`.

### Overriding a single dependency

Use `Platform.configure()` to override one or more dependencies, while keeping the rest at
whatever they're currently set to (defaults, or a previous `configure()` call):

```ts
import { Platform, type TimeCoordinator } from '@okta/auth-foundation';

class CustomTimeCoordinator implements TimeCoordinator {
  clockSkew = 0;
  clockTolerance = 100;
  now () { return /* ... */ };
}

Platform.configure({
  TimeCoordinator: new CustomTimeCoordinator()
});
```

> [!Tip]
> Call `Platform.configure()` once at application startup, before using any other SDK
> functionality. `Platform.configure()` still pulls in the default implementations for whichever
> dependencies you *don't* override — see below if you want to avoid bundling those entirely.

### Avoiding the default implementations in your bundle

Importing from `@okta/auth-foundation` (or a Platform library's own default entry point) always
includes that library's default `Platform` implementations in the bundle, even if you immediately
override them with `Platform.configure()`. If you're implementing support for an environment none
of the existing Platform libraries cover, import from `/core` instead and call
`Platform.registerDefaultsLoader()` yourself, before any other SDK code runs:

```ts
// src/platform.ts — imported before any other `@okta/*` module
import { Platform, type PlatformDependencies } from '@okta/auth-foundation/core';

Platform.registerDefaultsLoader((): PlatformDependencies => ({
  TimeCoordinator: myTimeCoordinator,
  DPoPSigningAuthority: myDPoPSigningAuthority,
  DPoPNonceCache: myDPoPNonceCache
}));
```

If you skip this step while importing from `/core`, accessing any of `Platform.TimeCoordinator` /
`Platform.DPoPSigningAuthority` / `Platform.DPoPNonceCache` throws a `PlatformRegistryError`.

