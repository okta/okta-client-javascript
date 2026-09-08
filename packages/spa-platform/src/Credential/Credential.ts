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
 * A browser-specific extension of `@okta/auth-foundation` {@link AuthFoundation!Credential | Credential}
 * 
 * @remarks
 * Uses {@link BroadcastChannel} to synchronize tokens across tabs. In testing environments, it may be
 * required to use {@link Credential.close} to prevent open handles.
 * 
 * @group Credential
 * @noInheritDoc
 * 
 * @see Base Class: {@link AuthFoundation!Credential | Credential}
 */
export class Credential extends CredentialBase implements RequestAuthorizer, JSONSerializable {
  static {
    this.coordinator = new CredentialCoordinatorImpl(this);
  }

  /**
   * Closes the underlying {@link BroadcastChannel}, useful for testing environments to avoid open handles
   *
   * @see
   * {@link https://jestjs.io/docs/cli#--detectopenhandles | jest --detectOpenHandles}
   */
  public static close () {
    // `?.` syntax means `.close` will only be invoked if it exists on the CredentialCoordinator implementation
    (this.coordinator as CredentialCoordinatorImpl)?.close?.();
  }
}
