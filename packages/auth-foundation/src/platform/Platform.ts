import { AuthSdkError } from '../errors/AuthSdkError.ts';
import type { DPoPSigningAuthority } from '../oauth2/dpop/index.ts';
import type { TimeCoordinator } from '../utils/TimeCoordinator.ts';


export interface PlatformDependencies {
  TimeCoordinator: TimeCoordinator;
  DPoPSigningAuthority: DPoPSigningAuthority;
}

export class PlatformRegistryError extends AuthSdkError {}

export class PlatformRegistry {
  #deps: PlatformDependencies | null = null;
  #defaultsLoader: (() => PlatformDependencies) | null = null;

  /**
   * Override default platform dependencies globally
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

  /** @internal - Called by full build entry point */
   public registerDefaultsLoader(loader: () => PlatformDependencies): void {
    this.#defaultsLoader = loader;
  }

  /**
   * Resets loaded dependencies. For testing purposes mostly.
   */
  public reset (): void {
    this.#deps = null;
  }

  /**
   * Get all current dependencies (configured or defaults)
   */
  protected get resolved (): PlatformDependencies {
    return this.#deps ?? this.getDefaults();
  }

  /**
   * Override in subclasses to provide platform-specific defaults
   * 
   * @internal
   */
  protected getDefaults(): PlatformDependencies {
    if (!this.#defaultsLoader) {
      throw new PlatformRegistryError(
        `No platform defaults available. Import from "@okta/auth-foundation" directly or call Platform.configure()`
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
  public get TimeCoordinator(): TimeCoordinator {
    return this.resolved.TimeCoordinator;
  }

  /**
   * Get the current DPoPSigningAuthority instance
   * 
   * @remarks
   * Returns configured override or factory default
   */
  public get DPoPSigningAuthority(): DPoPSigningAuthority {
    return this.resolved.DPoPSigningAuthority;
  }
}

export const Platform = new PlatformRegistry();
