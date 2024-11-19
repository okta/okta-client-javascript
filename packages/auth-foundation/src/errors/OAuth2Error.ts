import { OAuth2ErrorResponse, isOAuth2ErrorResponse } from '../types';
import { AuthSdkError } from './AuthSdkError';

/**
 * @group Errors
 */
export class OAuth2Error extends AuthSdkError {
  description?: string;
  uri?: string;

  constructor (error: string | OAuth2ErrorResponse, description?: string, uri?: string) {
    let msg = error;

    if (isOAuth2ErrorResponse(error)) {
      msg = error.error;
      description = error.errorDescription;
      uri = error.errorUri;
    }

    super(msg as string);
    this.description = description;
    this.uri = uri;
  }

  get error () { return this.message; }
}
