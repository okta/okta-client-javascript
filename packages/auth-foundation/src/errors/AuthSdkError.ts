/**
 * @module
 * @mergeModuleWith Core
 */

import { JsonRecord } from '../types/lib.ts';

/**
 * Base Error class for all errors defined within Okta Client JavaScript
 * 
 * @group Errors
 * @noInheritDoc
 */
export class AuthSdkError extends Error {
  /**
   * A dictionary to store the context in which the error was thrown
   * For example: The authentication context when an error is thrown during an authentication flow
   */
  context: JsonRecord = {};

  constructor (message?: string, options?: ErrorOptions & { context?: JsonRecord }) {
    super(message, options);
    this.context = options?.context ?? {};
  }
}
