/**
 * @module Core
 */

import { AuthSdkError } from '@okta/auth-foundation/core';
import { AuthenticationFlow } from './AuthenticationFlow.ts';

/**
 * Thrown when a {@link LogoutFlow} is used incorrectly
 * @group Errors
 */
export class LogoutFlowError extends AuthSdkError {}

// NOTE: currently no difference between Auth and Logout flows, simply extend class for now
/**
 * Base class shared by all logout flows in this package (e.g. {@link SessionLogoutFlow})
 */
export abstract class LogoutFlow extends AuthenticationFlow {}


export namespace LogoutFlow {
  /** {@inheritDoc Core!AuthenticationFlow.Options} */
  export type Options = AuthenticationFlow.Options;
}
