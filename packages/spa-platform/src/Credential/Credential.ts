/**
 * @module
 * @mergeModuleWith Platform
 */

import {
  Credential as CredentialBase,
  type RequestAuthorizer,
  type JSONSerializable,
  type CredentialCoordinator,
} from '@okta/auth-foundation';
import { CredentialCoordinatorImpl } from './CredentialCoordinator.ts';


/**
 * A browser-specific implementation of `@okta/auth-foundation` {@link AuthFoundation!Credential | Credential}
 * 
 * @group Credential
 * @noInheritDoc
 */
export class Credential extends CredentialBase implements RequestAuthorizer, JSONSerializable {
  protected static readonly coordinator: CredentialCoordinator = new CredentialCoordinatorImpl(this);

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
}
