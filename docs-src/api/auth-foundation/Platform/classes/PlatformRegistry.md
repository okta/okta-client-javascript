[@okta/auth-foundation](../..) / [Platform](../index.md) / PlatformRegistry

# Class: PlatformRegistry

> [!Warning]
> **DO NOT** construct an instance of this `PlatformRegistry`. Use `import { Platform } from '@okta/auth-foundation'`.

A singleton registry of globally-available singleton dependencies which can
provide platform-specific default implementations and enable overriding as needed

For example, the [TimeCoordinator](../../Core/interfaces/TimeCoordinator.md) should be globally available to be a
centralized entity to perform all time calculations. Registering the [TimeCoordinator](../../Core/interfaces/TimeCoordinator.md)
as a [Platform](../index.md) dependency enables consumers to access the [TimeCoordinator](../../Core/interfaces/TimeCoordinator.md) via

## Example

```ts
import { Platform } from '@okta/auth-foundation';
const currentTime = Platform.TimeCoordinator.now();
```

To enable tree-shaking and prevent including default implementations (bundle bloat) which 
will be instantaneously overwritten, default implementations can be selectively included.

## Remarks

Use `import * from '@okta/auth-foundation'` for standard usage, including all default platform
dependency implementations.

Use `import * from '@okta/auth-foundation/core'` for deeper customizations of platform dependencies,
this does not include any default implementations. [PlatformRegistryError](PlatformRegistryError.md) will be thrown if
a dependency is used before an implementation is provided

## Implements

- [`PlatformDependencies`](../interfaces/PlatformDependencies.md)

## Constructors

### Constructor

> **new PlatformRegistry**(): `PlatformRegistry`

#### Returns

`PlatformRegistry`

## Accessors

### TimeCoordinator

#### Get Signature

> **get** **TimeCoordinator**(): [`TimeCoordinator`](../../Core/interfaces/TimeCoordinator.md)

Get the current TimeCoordinator instance

##### Remarks

Returns configured override or factory default

##### Returns

[`TimeCoordinator`](../../Core/interfaces/TimeCoordinator.md)

A sourece-of-truth for the current time.

#### Implementation of

[`PlatformDependencies`](../interfaces/PlatformDependencies.md).[`TimeCoordinator`](../interfaces/PlatformDependencies.md#timecoordinator)

***

### DPoPSigningAuthority

#### Get Signature

> **get** **DPoPSigningAuthority**(): [`DPoPSigningAuthority`](../../OAuth2/interfaces/DPoPSigningAuthority.md)

Get the current DPoPSigningAuthority instance

##### Remarks

Returns configured override or factory default

##### Returns

[`DPoPSigningAuthority`](../../OAuth2/interfaces/DPoPSigningAuthority.md)

A Platform-level singleton for performing `DPoP` operations. The [DPoPSigningAuthority](../../OAuth2/interfaces/DPoPSigningAuthority.md) is
reasonable for mangaging `DPoP` key pairs and generate `DPoP` proofs for outgoing [Request](https://developer.mozilla.org/docs/Web/API/Request)s

#### Implementation of

[`PlatformDependencies`](../interfaces/PlatformDependencies.md).[`DPoPSigningAuthority`](../interfaces/PlatformDependencies.md#dpopsigningauthority)

***

### DPoPNonceCache

#### Get Signature

> **get** **DPoPNonceCache**(): [`DPoPNonceCache`](../../OAuth2/interfaces/DPoPNonceCache.md)

Get the current DPoPNonceCache instance

##### Remarks

Returns configured override or factory default

##### Returns

[`DPoPNonceCache`](../../OAuth2/interfaces/DPoPNonceCache.md)

> The intent is that clients need to keep only one nonce value and 
servers need to keep a window of recent nonces.

via https://datatracker.ietf.org/doc/html/rfc9449#section-8

Authorization servers may provide the same `dpop-nonce` value for a window of time.
The `DPoPNonceCache` serves as a cache of these nonce values to avoid unnecessary
failures. [DPoPSigningAuthority.sign](../../OAuth2/interfaces/DPoPSigningAuthority.md#sign) will 
use nonce values from the cache when available.

#### Remarks

A `DPoPNonceCache` instance will be create for each [APIClient](../../Networking/APIClient/index.md) instance,
but `DPoPNonceCache` implementations will often share a common store

#### Implementation of

[`PlatformDependencies`](../interfaces/PlatformDependencies.md).[`DPoPNonceCache`](../interfaces/PlatformDependencies.md#dpopnoncecache)

## Methods

### configure()

> **configure**(`dependencies`): `void`

Override default platform dependencies globally

This pattern will include the default implementations within the resulting bundle,
causing essentially dead code to be bundled. This will likely be acceptable for
most standard use cases. For scenarios where deeper customizations are required
see [PlatformRegistry.registerDefaultsLoader](#registerdefaultsloader)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `dependencies` | [`Partial`](https://www.typescriptlang.org/docs/handbook/utility-types.html#partialtype)\<[`PlatformDependencies`](../interfaces/PlatformDependencies.md)\> |

#### Returns

`void`

#### Remarks

Call this once at application startup before using any SDK components.
Partial updates are supported - only override what you need.

***

### registerDefaultsLoader()

> **registerDefaultsLoader**(`loader`): `void`

Registers a loader to provide the platform dependency default implementations

When a deeper customization of platform dependencies is required, this method can
be used to provide custom implementations of platform dependencies without including
the provided default implementations in any resulting bundle.

This pattern is not recommended for standard SDK usage and should only be used if deep
customization is required (like providing support to an otherwise unsupported runtime environment)

For standard usage, see [PlatformRegistry.configure](#configure)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `loader` | () => [`PlatformDependencies`](../interfaces/PlatformDependencies.md) |

#### Returns

`void`

#### Remarks

Call this once at application startup before using any SDK components.

#### Example

```ts
// src/auth.ts
import { Platform } from '@okta/auth-foundation/core';    // ensure "/core" is imported specifically

Platform.registerDefaultsLoader(() => ({
  TimeCoordinator: MyCustomTimeCoordinator
  // define other dependencies
}));

// ensure this module is loaded before any other '@okta/*' dependencies
```
