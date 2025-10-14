/**
 * @module
 * @mergeModuleWith Platform
 */

import {
  TokenInit,
  OAuth2ErrorResponse,
  isOAuth2ErrorResponse,
  OAuth2Error,
  DPoPSigningAuthority,
  DPoPNonceCache
} from '@okta/auth-foundation';
import OAuth2ClientBase from '@okta/auth-foundation/client';
import { SynchronizedResult } from '../utils/SynchronizedResult.ts';
import { Token } from './Token.ts';
import { PersistentCache } from './dpop/index.ts';
import { DefaultSigningAuthority } from './dpop/authority.ts';


/**
 * Browser-specific implementation of {@link OAuth2Client}
 * 
 * @group OAuth2Client
 */
export class OAuth2Client extends OAuth2ClientBase {
  public readonly dpopSigningAuthority: DPoPSigningAuthority = DefaultSigningAuthority;
  protected readonly dpopNonceCache: DPoPNonceCache = new PersistentCache('okta-dpop-nonce');

  protected createToken (init: TokenInit): Token {
    return new Token(init);
  }

  protected prepareRefreshRequest (token: Token, scopes?: string[]): Promise<Token | OAuth2ErrorResponse> {
    if (!token.refreshToken) {
      throw new OAuth2Error(`Missing token: refreshToken`);
    }

    const synchronizer = new SynchronizedResult<Token | OAuth2ErrorResponse, TokenInit | OAuth2ErrorResponse>(
      `refresh:${token.refreshToken}`,
      this.performRefresh.bind(this, token, scopes),
      {
        seralizer: (response: Token | OAuth2ErrorResponse) => isOAuth2ErrorResponse(response) ? response : response.toJSON() as TokenInit,
        deseralizer: (response: TokenInit | OAuth2ErrorResponse) =>
          isOAuth2ErrorResponse(response) ? response : new Token({ id: token.id, ...response }),
      }
    );

    // wraps refresh action in a local promise queue and tab-synchronized result
    return synchronizer.exec();
  }
}
