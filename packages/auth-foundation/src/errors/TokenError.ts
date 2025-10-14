/**
 * @module
 * @mergeModuleWith Core
 */

import { AuthSdkError } from './AuthSdkError.ts';

/**
 * Thrown when a {@link Token | Token} instance encounters an unexpected condition
 * 
 * @group Errors
 */
export class TokenError extends AuthSdkError {}
