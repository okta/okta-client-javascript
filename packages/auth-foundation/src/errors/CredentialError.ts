/**
 * @module
 * @mergeModuleWith Core
 */

import { AuthSdkError } from './AuthSdkError.ts';


/**
 * Thrown when a {@link Credential} instance encounters an unexpected condition
 * 
 * @group Errors
 */
export class CredentialError extends AuthSdkError {}
