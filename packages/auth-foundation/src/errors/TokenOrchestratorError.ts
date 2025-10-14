/**
 * @module
 * @mergeModuleWith Core
 */

import { AuthSdkError } from './AuthSdkError.ts';


/**
 * Thrown when a {@link TokenOrchestrator} encounters an unexpected condition
 * 
 * @group Errors
 */
export class TokenOrchestratorError extends AuthSdkError {}
