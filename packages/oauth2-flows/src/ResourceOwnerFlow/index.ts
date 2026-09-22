/**
 * @module ResourceOwnerFlow
 */

import {
  OAuth2Client,
  OAuth2Error,
  isOAuth2ErrorResponse,
  mergeURLSearchParameters,
  Token,
} from '@okta/auth-foundation/core';
import { AuthenticationFlow } from '../AuthenticationFlow.ts';


/**
 * An implementation of the Resource Owner Password Credentials Grant
 *
 * @remarks
 * This grant type exchanges a user's username and password directly for tokens, without any
 * redirect. It requires the `Authorization Server` to fully trust the client with the user's
 * credentials, and does not support multi-factor authentication or other more secure sign-in
 * experiences. It is not recommended for production use, and most `Authorization Server`s
 * disable it by default.
 * 
 * > [!IMPORTANT]
 * > At Okta, this grant type can only be enabled on Native Clients.
 *
 * @example
 * ```typescript
 * const client = new OAuth2Client(params);
 * const flow = new ResourceOwnerFlow(client);
 *
 * const token = await flow.start(username, password);
 * ```
 *
 * @see
 * - {@link https://datatracker.ietf.org/doc/html/rfc6749#section-4.3 | RFC 6749 - Resource Owner Password Credentials Grant}
 */
export class ResourceOwnerFlow extends AuthenticationFlow {
  readonly client: OAuth2Client;
  readonly additionalParameters: Record<string, string>;

  /** Constructs a new {@link OAuth2Client} internally from `options` */
  constructor (options: ResourceOwnerFlow.InitOptions);
  /** Uses an existing {@link OAuth2Client} instance */
  constructor (client: OAuth2Client, options?: ResourceOwnerFlow.Params);
  constructor (
    client: OAuth2Client | ResourceOwnerFlow.InitOptions,
    options?: ResourceOwnerFlow.Params
  ) {
    super();
    if (client instanceof OAuth2Client) {
      this.client = client;
    }
    else {
      const { issuer, additionalParameters, ...oauth2Params } = client;
      this.client = new OAuth2Client({ baseURL: issuer, ...oauth2Params });
      options = { additionalParameters };
    }

    this.additionalParameters = options?.additionalParameters ?? {};
  }

  /** {@inheritDoc Core!AuthenticationFlow.inProgress} */
  public get isAuthenticating (): boolean {
    return this.inProgress;
  }

  /**
   * Exchanges a user's `username` and `password` for tokens
   *
   * @param username - The user's username
   * @param password - The user's password
   * @param additionalParameters - **Optional.** A map of additional parameters to be added to the `/token` request
   * @returns The exchanged {@link Token}
   */
  public async start (
    username: string,
    password: string,
    additionalParameters: Record<string, string> = {}
  ): Promise<Token> {
    this.startFlow();

    try {
      const openIdConfig = await this.client.openIdConfiguration();

      const request = new ResourceOwnerFlow.TokenRequest({
        openIdConfiguration: openIdConfig,
        clientConfiguration: this.client.configuration,
        username,
        password,
        scope: this.client.configuration.scopes,
      });

      mergeURLSearchParameters(request.body, this.additionalParameters, additionalParameters);

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

export namespace ResourceOwnerFlow {
  /**
   * Params needed when constructing a {@link ResourceOwnerFlow} from an existing {@link OAuth2Client}
   */
  export type Params = {
    /** Additional parameters to include on every `/token` request made by this flow */
    additionalParameters?: Record<string, string>;
  };

  /**
   * Options required to construct a {@link ResourceOwnerFlow} instance
   * @interface
   */
  export type InitOptions = AuthenticationFlow.Options & Params;

  /** @internal */
  export interface TokenRequestParams extends Omit<Token.TokenRequestParams, 'grantType'> {
    username: string;
    password: string;
    scope?: string;
  }

  /** @internal */
  export class TokenRequest extends Token.TokenRequest {
    username: string;
    password: string;
    scope?: string;

    constructor (params: ResourceOwnerFlow.TokenRequestParams) {
      const { openIdConfiguration, clientConfiguration, acrValues, maxAge } = params;
      super({ openIdConfiguration, clientConfiguration, acrValues, maxAge, grantType: 'password' });
      this.username = params.username;
      this.password = params.password;
      this.scope = params.scope;

      this.body.set('username', this.username);
      this.body.set('password', this.password);
      if (this.scope) {
        this.body.set('scope', this.scope);
      }
    }
  }
}
