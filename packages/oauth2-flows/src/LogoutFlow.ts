/**
 * @module Core
 */

import { AuthSdkError } from '@okta/auth-foundation';
import { AuthenticationFlow } from './AuthenticationFlow.ts';

/**
 * @group Errors
 */
export class LogoutFlowError extends AuthSdkError {}

// NOTE: currently no difference between Auth and Logout flows, simply extend class for now
/**
 * Abstract class representing a logout flow
 */
export abstract class LogoutFlow extends AuthenticationFlow {}


export namespace LogoutFlow {
  export type Options = AuthenticationFlow.Options;
}
