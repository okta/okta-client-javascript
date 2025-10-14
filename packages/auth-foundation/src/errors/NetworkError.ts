/**
 * @module
 * @mergeModuleWith Core
 */

import { AuthSdkError } from './AuthSdkError.ts';

/**
 * Thrown when a problem occurs when sending or processing a network request
 * 
 * @group Errors
 */
export class NetworkError extends AuthSdkError {}
