/**
 * @module TokenExchangeFlow
 */

import {
  OAuth2Client,
  OAuth2Error,
  isOAuth2ErrorResponse,
  Token,
} from '@okta/auth-foundation/core';
import { AuthenticationFlow, AuthenticationFlowError } from '../AuthenticationFlow.ts';

/**
 * An implementation of OAuth 2.0 Token Exchange
 *
 * @remarks
 * This is a generic RFC 8693 mechanism with no knowledge of any particular exchanged-token "product"
 * (e.g. Okta's Native-to-Web SSO `interclient_token`). Platform packages subclass this to add that
 * specific behavior — see `InterclientAccessFlow` in `@okta/react-native-platform`.
 *
 * @example
 * ```typescript
 * const client = new OAuth2Client(params);
 * const flow = new TokenExchangeFlow(client);
 *
 * const exchangedToken = await flow.exchange({
 *   subjectToken: idToken,
 *   actorToken: accessToken,
 *   requestedTokenType: 'urn:okta:params:oauth:token-type:interclient_token',
 *   audience: 'urn:okta:apps:0oa...'
 * });
 * ```
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc8693 | RFC 8693 - OAuth 2.0 Token Exchange}
 */
export class TokenExchangeFlow extends AuthenticationFlow {
  readonly client: OAuth2Client;

  /** Constructs a new {@link OAuth2Client} internally from `options` */
  constructor (options: TokenExchangeFlow.Options);
  /** Uses an existing {@link OAuth2Client} instance */
  constructor (client: OAuth2Client);
  constructor (client: OAuth2Client | TokenExchangeFlow.Options) {
    super();
    if (client instanceof OAuth2Client) {
      this.client = client;
    }
    else {
      const { issuer, ...oauth2Params } = client;
      this.client = new OAuth2Client({ baseURL: issuer, ...oauth2Params });
    }
  }

  /**
   * Performs a Token Exchange request
   *
   * @throws {@link AuthFoundation!OAuth2.OAuth2Error | OAuth2Error} if the Authorization Server returns an error response
   */
  public async start (params: TokenExchangeFlow.ExchangeParams): Promise<Token> {
    this.startFlow();

    try {
      const openIdConfiguration = await this.client.openIdConfiguration();

      const request = new TokenExchangeFlow.TokenRequest({
        openIdConfiguration,
        clientConfiguration: this.client.configuration,
        ...params
      });

      const response = await this.client.exchange(request);

      if (isOAuth2ErrorResponse(response)) {
        throw new OAuth2Error(response);
      }

      return response;
    }
    catch (err) {
      this.emitter.emit('flow_errored', { error: err });
      throw err;
    }
    finally {
      this.reset();
    }
  }
}

export namespace TokenExchangeFlow {
  export type Options = AuthenticationFlow.Options
  
  /**
   * Parameters for a Token Exchange request
   * @see {@link https://datatracker.ietf.org/doc/html/rfc8693#section-2.1 | RFC 8693 - Token Exchange Request}
   */
  export type ExchangeParams = {
    /** The token being exchanged, ex. an `id_token` */
    subjectToken: string;
    /** Identifies the type of {@link ExchangeParams.subjectToken}. Defaults to `urn:ietf:params:oauth:token-type:id_token` */
    subjectTokenType: string;
    /** A token representing the identity of the acting party, ex. an `access_token` */
    actorToken?: string;
    /** Identifies the type of {@link ExchangeParams.actorToken}. Defaults to `urn:ietf:params:oauth:token-type:access_token` */
    actorTokenType?: string;
    /** Identifies the type of token requested in exchange */
    requestedTokenType?: string;
    /** The logical name of the target service where the exchanged token will be used */
    audience?: string;
    /** A URI indicating the target service or resource where the exchanged token will be used */
    resource?: string;
    /** Scope(s) requested for the exchanged token */
    scope?: string;
  };

  /** @internal */
  export interface TokenRequestParams extends Omit<Token.TokenRequestParams, 'grantType'>, ExchangeParams {}

  /** @internal */
  export class TokenRequest extends Token.TokenRequest {
    constructor (params: TokenRequestParams) {
      const { openIdConfiguration, clientConfiguration } = params;
      super({
        openIdConfiguration,
        clientConfiguration,
        grantType: 'urn:ietf:params:oauth:grant-type:token-exchange'
      });

      this.body.set('subject_token', params.subjectToken);
      this.body.set('subject_token_type', params.subjectTokenType);

      if (params.actorToken) {
        this.body.set('actor_token', params.actorToken);
        if (!params.actorTokenType) {
          throw new AuthenticationFlowError('`actor_token_type` is required when `actor_token` is provided.');
        }
        this.body.set('actor_token_type', params.actorTokenType);
      }

      if (params.requestedTokenType) {
        this.body.set('requested_token_type', params.requestedTokenType);
      }
      if (params.audience) this.body.set('audience', params.audience);
      if (params.resource) this.body.set('resource', params.resource);
      if (params.scope) this.body.set('scope', params.scope);
    }
  }
}