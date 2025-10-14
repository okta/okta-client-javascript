/**
 * @module
 * @mergeModuleWith Core
 */

import { AuthSdkError } from './AuthSdkError.ts';

/**
 * Thrown when a problem occurs during {@link JWT} parsing or processing
 * 
 * @group Errors
 */
export class JWTError extends AuthSdkError {}
