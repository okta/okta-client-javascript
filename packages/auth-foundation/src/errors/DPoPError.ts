/**
 * @module
 * @mergeModuleWith Core
 */

import { AuthSdkError } from './AuthSdkError.ts';

/**
 * Thrown when a problem occurs during a token DPoP operation
 *
 * @group Errors
 */
export class DPoPError extends AuthSdkError {}
