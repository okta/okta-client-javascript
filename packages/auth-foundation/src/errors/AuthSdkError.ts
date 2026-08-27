/**
 * @module
 * @mergeModuleWith Core
 */

import { JsonRecord } from '../types/lib.ts';

/**
 * Base Error class for all errors defined within Okta Client JavaScript
 * 
 * @group Errors
 */
export class AuthSdkError extends Error {
  /**
   * A dictionary to store the context in which the error was thrown
   * For example: The authentication context when an error is thrown during an authentication flow
   */
  context: JsonRecord = {};

  /**
   * A logical grouping associated with specific errors
   */
  code?: string;

  constructor (message?: string, options?: ErrorOptions & { context?: JsonRecord, code?: string }) {
    super(message, options);
    this.context = options?.context ?? {};
    if (options?.code) {
      this.code = options.code;
    }
  }
}
