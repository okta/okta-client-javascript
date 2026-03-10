import { AuthSdkError } from '../errors/AuthSdkError.ts';
import type { DPoPSigningAuthority } from '../oauth2/dpop/index.ts';
import type { TimeCoordinator } from '../utils/TimeCoordinator.ts';
import type { DPoPNonceCache } from '../oauth2/dpop/index.ts';

/**
 * The required Platform dependencies
 */
export interface PlatformDependencies {
  TimeCoordinator: TimeCoordinator;
  DPoPSigningAuthority: DPoPSigningAuthority;
  DPoPNonceCache: DPoPNonceCache;
}

export class PlatformRegistryError extends AuthSdkError {}

/**
 * A singleton registry of globally-available singleton dependencies which can
 * provide platform-specific default implementations and enable overriding as needed
 *
 * For example, the {@link TimeCoordinator} should be globally available to be a
 * centralized entity to perform all time calculations. Registering the {@link TimeCoordinator}
 * as a {@link Platform} dependency enables consumers to access the {@link TimeCoordinator} via
 *
 * @example
 * ```
 * import { Platform } from '@okta/auth-foundation';
 * const currentTime = Platform.TimeCoordinator.now();
 * ```
 *
 * To enable tree-shaking and prevent including default implementations (bundle bloat) which 
 * will be instanceously overwritten, default implemenations can be selectively included.
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
   * ```
   * // src/auth.ts
   * import { Platform } from '@okta/auth-foundation/core';    // ensure "/core" is imported specifically
   *
   * Platform.registerDefaultsLoader(() => ({
   *   TimeCoordinator: MyCustomTimeCoordinator
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
   * Get the current TimeCoordinator instance
   *
   * @remarks
   * Returns configured override or factory default
   */
  public get DPoPNonceCache (): DPoPNonceCache {
    return this.resolved.DPoPNonceCache;
  }
}

export const Platform = new PlatformRegistry();
