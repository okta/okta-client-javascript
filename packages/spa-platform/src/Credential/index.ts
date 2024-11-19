/**
 * @module lib
 */

import { addEnv } from '@okta/auth-foundation';

import { Credential } from './Credential';
import { Events, TokenKind } from './types';
import * as Errors from './errors';

// TODO: rename from package.json or use build?
const packageName = '@okta/spa-credential-manager';
const version = '0.0.0';
addEnv(`${packageName}/${version}`);

export { Credential };
export { Events, TokenKind };
export { Errors };
export type { CredentialCoordinator } from './CredentialCoordinator';
export type { CredentialDataSource } from './CredentialDataSource';
export type { TokenStorage } from './TokenStorage';
