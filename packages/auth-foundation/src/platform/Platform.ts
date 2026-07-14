/**
 * `Platform` is a registry of platform-wide **singleton** dependencies (time, DPoP key signing, DPoP
 * nonce storage, etc.) that are shared across the whole SDK ecosystem, rather than constructed
 * per-instance by whatever class happens to need them.
 *
 * Some of these dependencies vary by JS environment - `DPoPSigningAuthority` and `DPoPNonceCache`
 * need genuinely different implementations in a browser vs. React Native, since they lean on
 * environment-specific crypto/storage APIs. Others, like `TimeCoordinator`, aren't tied to any
 * particular runtime at all; they're registered here simply because the SDK needs exactly *one*
 * shared instance (e.g. for clock-skew coordination) rather than one per consumer. Either way,
 * funneling both kinds of dependency through the same `Platform` registry gives every part of the
 * SDK one consistent, easy pattern for overriding behavior, instead of each dependency inventing
 * its own configuration mechanism.
 *
 * Most consumers never need to touch this module directly. Platform packages like [@okta/spa-platform](/api/spa-platform/)
 * or [@okta/react-native-platform](/api/spa-platform/) already register the right implementations for their environment,
 * and importing from `@okta/auth-foundation` pulls in working defaults out of the box.
 *
 * Reach for `Platform` yourself only if you need to override a specific dependency (for example,
 * providing a custom `TimeCoordinator` in tests) via {@link PlatformRegistry.configure}, or you're
 * adding support for a runtime this SDK doesn't already target, via
 * {@link PlatformRegistry.registerDefaultsLoader}.
 *
 * @remarks
 * By convention, every `@okta/*` SDK package exports a `/core` entry point alongside its default
 * entry point. The default entry point (e.g. `@okta/auth-foundation`) calls
 * {@link PlatformRegistry.registerDefaultsLoader} on your behalf with that platform's default
 * implementations already wired up - simple to use, but it means those defaults are always
 * included in your bundle, even if you go on to override them.
 *
 * The `/core` entry point (e.g. `@okta/auth-foundation/core`) is identical, *except* it skips that
 * `registerDefaultsLoader` call. This gives you a way to fully replace a `Platform` dependency
 * without ever pulling its default implementation into your bundle - useful if the default is
 * heavy, or simply not needed for your use case. If you go this route, you must call
 * {@link PlatformRegistry.registerDefaultsLoader} yourself before any other SDK code runs, or
 * {@link PlatformRegistryError} will be thrown the first time a dependency is accessed.
 * @module Platform
 */

import { AuthSdkError } from '../errors/AuthSdkError.ts';
import type { DPoPSigningAuthority } from '../oauth2/dpop/index.ts';
import type { TimeCoordinator } from '../utils/TimeCoordinator.ts';
import type { DPoPNonceCache } from '../oauth2/dpop/index.ts';

/**
 * The required {@link Platform} dependencies
 */
export interface PlatformDependencies {
  /** {@inheritDoc Core.TimeCoordinator} */
  TimeCoordinator: TimeCoordinator;
  /** {@inheritDoc OAuth2.DPoPSigningAuthority} */
  DPoPSigningAuthority: DPoPSigningAuthority;
  /** {@inheritDoc OAuth2.DPoPNonceCache} */
  DPoPNonceCache: DPoPNonceCache;
}

/**
 * Thrown when the {@link Platform} registry cannot resolve a dependency.
 */
export class PlatformRegistryError extends AuthSdkError {}

/**
 * > [!Warning]
 * > **DO NOT** construct an instance of this `PlatformRegistry`. Use `import { Platform } from '@okta/auth-foundation'`.
 *
 * A singleton registry of globally-available singleton dependencies which can
 * provide platform-specific default implementations and enable overriding as needed
 *
 * For example, the {@link TimeCoordinator} should be globally available to be a
 * centralized entity to perform all time calculations. Registering the {@link TimeCoordinator}
 * as a {@link Platform} dependency enables consumers to access the {@link TimeCoordinator} via
 *
 * @example
 * ```ts
 * import { Platform } from '@okta/auth-foundation';
 * const currentTime = Platform.TimeCoordinator.now();
 * ```
 *
 * To enable tree-shaking and prevent including default implementations (bundle bloat) which 
 * will be instantaneously overwritten, default implementations can be selectively included.
 *
 * @remarks
 * Use `import * from '@okta/auth-foundation'` for standard usage, including all default platform
 * dependency implementations.
 *
 * Use `import * from '@okta/auth-foundation/core'` for deeper customizations of platform dependencies,
 * this does not include any default implementations. {@link PlatformRegistryError} will be thrown if
 * a dependency is used before an implementation is provided
 */
export class PlatformRegistry implements PlatformDependencies {
  #deps: PlatformDependencies | null = null;
  #defaultsLoader: (() => PlatformDependencies) | null = null;

  /**
   * Override default platform dependencies globally
   *
   * This pattern will include the default implementations within the resulting bundle,
   * causing essentially dead code to be bundled. This will likely be acceptable for
   * most standard use cases. For scenarios where deeper customizations are required
   * see {@link PlatformRegistry.registerDefaultsLoader}
   * 
   * @remarks
   * Call this once at application startup before using any SDK components.
   * Partial updates are supported - only override what you need.
   */
  public configure (dependencies: Partial<PlatformDependencies>): void {
    this.#deps = {
      ...this.getDefaults(),
      ...dependencies
    };
  }

  /**
   * Registers a loader to provide the platform dependency default implementations
   *
   * When a deeper customization of platform dependencies is required, this method can
   * be used to provide custom implementations of platform dependencies without including
   * the provided default implementations in any resulting bundle.
   *
   * This pattern is not recommended for standard SDK usage and should only be used if deep
   * customization is required (like providing support to an otherwise unsupported runtime environment)
   *
   * For standard usage, see {@link PlatformRegistry.configure}
   *
   * @remarks
   * Call this once at application startup before using any SDK components.
   *
   * @example
   * ```ts
   * // src/auth.ts
   * import { Platform } from '@okta/auth-foundation/core';    // ensure "/core" is imported specifically
   *
   * Platform.registerDefaultsLoader(() => ({
   *   TimeCoordinator: MyCustomTimeCoordinator
   *   // define other dependencies
   * }));
   *
   * // ensure this module is loaded before any other '@okta/*' dependencies
   * ```
   */
   public registerDefaultsLoader(loader: () => PlatformDependencies): void {
    this.#defaultsLoader = loader;
  }

  /**
   * @internal
   * Resets loaded dependencies. For testing purposes mostly.
   */
  public reset (): void {
    this.#deps = null;
  }

  /**
   * @internal
   * Get all current dependencies (configured or defaults)
   */
  protected get resolved (): PlatformDependencies {
    return this.#deps ?? this.getDefaults();
  }

  /**
   * @internal
   * Override in subclasses to provide platform-specific defaults
   */
  protected getDefaults (): PlatformDependencies {
    if (!this.#defaultsLoader) {
      throw new PlatformRegistryError(
        `No platform defaults available. Import from "@okta/auth-foundation" directly or call Platform.registerDefaultsLoader()`
      );
    }
    return this.#defaultsLoader();
  }

  /**
   * Get the current TimeCoordinator instance
   *
   * @remarks
   * Returns configured override or factory default
   */
  public get TimeCoordinator (): TimeCoordinator {
    return this.resolved.TimeCoordinator;
  }

  /**
   * Get the current DPoPSigningAuthority instance
   *
   * @remarks
   * Returns configured override or factory default
   */
  public get DPoPSigningAuthority (): DPoPSigningAuthority {
    return this.resolved.DPoPSigningAuthority;
  }

  /**
   * Get the current DPoPNonceCache instance
   *
   * @remarks
   * Returns configured override or factory default
   */
  public get DPoPNonceCache (): DPoPNonceCache {
    return this.resolved.DPoPNonceCache;
  }
}

/** @internal */
export const Platform = new PlatformRegistry();
