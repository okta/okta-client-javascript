/**
 * @module
 * @mergeModuleWith Core
 */

import { AuthSdkError } from './AuthSdkError.ts';

/**
 * Thrown when an {@link Networking.APIClient} encounters an unexpected condition
 * 
 * @group Errors
 */
export class APIClientError extends AuthSdkError {}
