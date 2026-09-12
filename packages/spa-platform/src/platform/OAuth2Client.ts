/**
 * @module
 * @mergeModuleWith Platform
 */

import {
  Token,
  OAuth2Client as OAuth2ClientBase,
  type TokenInit,
  OAuth2ErrorResponse,
  isOAuth2ErrorResponse,
} from '@okta/auth-foundation/core';
import { SynchronizedResult } from '../utils/SynchronizedResult.ts';


/**
 * Browser-specific implementation of {@link OAuth2Client}
 * 
 * @group OAuth2Client
 */
export class OAuth2Client extends OAuth2ClientBase {

  protected sendRefreshRequest (
    request: Token.RefreshRequest,
    context: OAuth2ClientBase.TokenRequestContext
  ): Promise<OAuth2ErrorResponse | Token> {
    const synchronizer = new SynchronizedResult<Token | OAuth2ErrorResponse, TokenInit | OAuth2ErrorResponse>(
      `refresh:${request.refreshToken}`,
      super.sendRefreshRequest.bind(this, request, context),
      {
        seralizer: (response: Token | OAuth2ErrorResponse) => isOAuth2ErrorResponse(response) ? response : response.toJSON() as TokenInit,
        deseralizer: (response: TokenInit | OAuth2ErrorResponse) =>
          isOAuth2ErrorResponse(response) ? response : new Token({ id: request.id, ...response }),
      }
    );

    // wraps refresh action in a local promise queue and tab-synchronized result
    return synchronizer.exec();
  }
}
