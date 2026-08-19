[@okta/auth-foundation](../..) / [Platform](../index.md) / PlatformDependencies

# Interface: PlatformDependencies

The required [Platform](../index.md) dependencies

## Properties

### TimeCoordinator

> **TimeCoordinator**: [`TimeCoordinator`](../../Core/interfaces/TimeCoordinator.md)

A sourece-of-truth for the current time.

***

### DPoPSigningAuthority

> **DPoPSigningAuthority**: [`DPoPSigningAuthority`](../../OAuth2/interfaces/DPoPSigningAuthority.md)

A Platform-level singleton for performing `DPoP` operations. The [DPoPSigningAuthority](../../OAuth2/interfaces/DPoPSigningAuthority.md) is
reasonable for mangaging `DPoP` key pairs and generate `DPoP` proofs for outgoing [Request](https://developer.mozilla.org/docs/Web/API/Request)s

***

### DPoPNonceCache

> **DPoPNonceCache**: [`DPoPNonceCache`](../../OAuth2/interfaces/DPoPNonceCache.md)

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
