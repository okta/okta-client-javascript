/**
 * @packageDocumentation
 * @internal
 */

import {
  type ConfigurationParams,
  DefaultCredentialDataSource as BaseCredentialDataSource,
  CredentialDataSource
} from '@okta/auth-foundation';
import { OAuth2Client } from '../platform/index.ts';


export class DefaultCredentialDataSource extends BaseCredentialDataSource implements CredentialDataSource {
  protected createOAuth2Client (params: ConfigurationParams): OAuth2Client {
    return new OAuth2Client(params);
  }
}
