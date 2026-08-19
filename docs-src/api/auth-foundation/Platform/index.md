[@okta/auth-foundation](..) / Platform

# Platform

`Platform` is a registry of platform-wide **singleton** dependencies (time, DPoP key signing, DPoP
nonce storage, etc.) that are shared across the whole SDK ecosystem, rather than constructed
per-instance by whatever class happens to need them.

Some of these dependencies vary by JS environment - `DPoPSigningAuthority` and `DPoPNonceCache`
need genuinely different implementations in a browser vs. React Native, since they lean on
environment-specific crypto/storage APIs. Others, like `TimeCoordinator`, aren't tied to any
particular runtime at all; they're registered here simply because the SDK needs exactly *one*
shared instance (e.g. for clock-skew coordination) rather than one per consumer. Either way,
funneling both kinds of dependency through the same `Platform` registry gives every part of the
SDK one consistent, easy pattern for overriding behavior, instead of each dependency inventing
its own configuration mechanism.

Most consumers never need to touch this module directly. Platform packages like [@okta/spa-platform](/api/spa-platform/)
or [@okta/react-native-platform](/api/spa-platform/) already register the right implementations for their environment,
and importing from `@okta/auth-foundation` pulls in working defaults out of the box.

Reach for `Platform` yourself only if you need to override a specific dependency (for example,
providing a custom `TimeCoordinator` in tests) via [PlatformRegistry.configure](classes/PlatformRegistry.md#configure), or you're
adding support for a runtime this SDK doesn't already target, via
[PlatformRegistry.registerDefaultsLoader](classes/PlatformRegistry.md#registerdefaultsloader).

## Remarks

By convention, every `@okta/*` SDK package exports a `/core` entry point alongside its default
entry point. The default entry point (e.g. `@okta/auth-foundation`) calls
[PlatformRegistry.registerDefaultsLoader](classes/PlatformRegistry.md#registerdefaultsloader) on your behalf with that platform's default
implementations already wired up - simple to use, but it means those defaults are always
included in your bundle, even if you go on to override them.

The `/core` entry point (e.g. `@okta/auth-foundation/core`) is identical, *except* it skips that
`registerDefaultsLoader` call. This gives you a way to fully replace a `Platform` dependency
without ever pulling its default implementation into your bundle - useful if the default is
heavy, or simply not needed for your use case. If you go this route, you must call
[PlatformRegistry.registerDefaultsLoader](classes/PlatformRegistry.md#registerdefaultsloader) yourself before any other SDK code runs, or
[PlatformRegistryError](classes/PlatformRegistryError.md) will be thrown the first time a dependency is accessed.

## Classes

| Class | Description |
| ------ | ------ |
| [PlatformRegistryError](classes/PlatformRegistryError.md) | Thrown when the Platform registry cannot resolve a dependency. |
| [PlatformRegistry](classes/PlatformRegistry.md) | > [!Warning] > **DO NOT** construct an instance of this `PlatformRegistry`. Use `import { Platform } from '@okta/auth-foundation'`. |

## Interfaces

| Interface | Description |
| ------ | ------ |
| [PlatformDependencies](interfaces/PlatformDependencies.md) | The required Platform dependencies |
