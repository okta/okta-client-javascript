/**
 * @module
 * @mergeModuleWith Platform
 */

import {
  Credential as CredentialBase,
  type RequestAuthorizer,
  type JSONSerializable,
} from '@okta/auth-foundation/core';
import { CredentialCoordinatorImpl } from './CredentialCoordinator.ts';


/**
 * A browser-specific implementation of `@okta/auth-foundation` {@link AuthFoundation!Credential | Credential}
 * 
 * @group Credential
 * @noInheritDoc
 */
export class Credential extends CredentialBase implements RequestAuthorizer, JSONSerializable {
  static {
    this.coordinator = new CredentialCoordinatorImpl(this);
  }

  /**
   * Closes the underlying BroadcastChannel, useful for testing environments to avoid open handles
   *
   * @see
   * {@link https://jestjs.io/docs/cli#--detectopenhandles | jest --detectOpenHandles}
   */
  public static close () {
    // `?.` syntax means `.close` will only be invoked if it exists on the CredentialCoordinator implementation
    (this.coordinator as CredentialCoordinatorImpl)?.close?.();
  }

  /**
   * Opts in to broadcasting credential lifecycle events (add/remove/refresh/default/metadata)
   * across browser tabs via `BroadcastChannel`, so state stays in sync everywhere.
   *
   * @remarks
   * Disabled by default. Call once, e.g. at application startup.
   */
  public static enableTabSync () {
    (this.coordinator as CredentialCoordinatorImpl)?.enableTabSync?.();
  }

  /**
   * Opts out of cross-tab broadcasting, closing the underlying BroadcastChannel.
   */
  public static disableTabSync () {
    (this.coordinator as CredentialCoordinatorImpl)?.disableTabSync?.();
  }
}
