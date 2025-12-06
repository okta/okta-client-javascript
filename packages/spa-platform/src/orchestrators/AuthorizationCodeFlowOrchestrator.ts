/**
 * @module
 * @mergeModuleWith TokenOrchestrators
 */

import {
  hasSameValues,
  toRelativeUrl,
  TokenOrchestrator,
  TokenOrchestratorError,
  EventEmitter
} from '@okta/auth-foundation';
import { AuthorizationCodeFlow } from '../flows/index.ts';
import { Token } from '../platform/index.ts';
import { Credential } from '../Credential/index.ts';


/** @internal */
const defaultOptions: AuthorizationCodeFlowOrchestrator.Options = {
  avoidPrompting: false,
  emitBeforeRedirect: true,
  getOriginalUri: () => {
    return toRelativeUrl(window.location.href);
  }
};

/**
 * An implementation of {@link AuthFoundation!TokenOrchestrator | TokenOrchestrator} leveraging
 * {@link https://developer.okta.com/docs/concepts/oauth-openid/#authorization-code-flow-with-pkce-flow | Authorization Code Flow }
 * @public
 */
export class AuthorizationCodeFlowOrchestrator extends TokenOrchestrator<AuthorizationCodeFlowOrchestrator.Events> {
  protected readonly emitter: EventEmitter<AuthorizationCodeFlowOrchestrator.Events> = new EventEmitter();
  options: AuthorizationCodeFlowOrchestrator.Options = defaultOptions;

  constructor (
    public readonly flow: AuthorizationCodeFlow,
    init: AuthorizationCodeFlowOrchestrator.Init = {}
  ) {
    const { avoidPrompting, emitBeforeRedirect, getOriginalUri, tags } = init;
    super();
    this.options = {
      tags,
      avoidPrompting: avoidPrompting ?? defaultOptions.avoidPrompting,
      emitBeforeRedirect: emitBeforeRedirect ?? defaultOptions.emitBeforeRedirect,
      getOriginalUri: getOriginalUri ?? defaultOptions.getOriginalUri,
    };
  }

  /**
   * Defines how to handle the authorization code redirect
   *
   * throws if an OAuth2 error is returned
   */
  public async resumeFlow (redirectUri: string = window.location.href) {
    try {
      const { token, context } = await this.flow.resume(redirectUri);

      const { tags } = context;
      await this.storeCredential(token, tags);

      return context;
    }
    catch (err) {
      if (err instanceof Error) {
        this.emitter.emit('error', { error: err });
      }
      throw err;
    }
  }

  /**
   * Defines how to search storage for an existing token
   */
  public async selectCredential (options: TokenOrchestrator.AuthorizeParams): Promise<Credential | null> {
    const filter: Partial<Token.Metadata> = { scopes: options.scopes };

    if (this.options.tags?.length ?? 0 > 0) {
      filter.tags = this.options.tags;
    }

    const matcher = (meta: Token.Metadata) => {
      const { scopes, tags } = meta;

      if (filter.tags && !hasSameValues(filter.tags, tags)) {
        return false;
      }

      if (filter.scopes && !hasSameValues(filter.scopes, scopes, false)) {
        return false;
      }

      return true;
    };

    return (await Credential.find(matcher))[0] ?? null;
  }

  /**
   * Defines how to store a newly acquired token
   */
  protected async storeCredential (token: Token, tags: string[] | undefined = this.options.tags): Promise<Credential> {
    return await Credential.store(token, tags);
  }

  /**
   * Defines how to request a token from Authorization Server
   */
  protected async requestToken (params: TokenOrchestrator.AuthorizeParams): Promise<Token | null> {
    if (this.flow.inProgress) {
      throw new TokenOrchestratorError('flow already in progress');
    }

    // TODO: handle requesting tokens from a different AS than the current flow is configured against
    // if (!this.flow.client.configuration.matches(params)) {
    // }

    // NOTE: passing different scopes is supported
    if ((params.clientId && params.clientId !== this.flow.client.configuration.clientId) ||
      (params.issuer && (new URL(params.issuer)).href !== this.flow.client.configuration.baseURL.href)
    ) {
      throw new TokenOrchestratorError('providing a differing `clientId` or `issuer` is not currently supported');
    }

    const context = { ...(params.scopes && { scopes: params.scopes }) };

    if (this.options.avoidPrompting) {
      await this.flow.start({}, context);
      const { token } = await AuthorizationCodeFlow.PerformSilently(this.flow);
      const newCredential = await this.storeCredential(token);
      return newCredential.token;
    }

    // handle with redirect
    const meta = { originalUri: this.options.getOriginalUri() };

    if (this.options.emitBeforeRedirect) {
      // promise blocks thread until the `done` function is called in the loginPrompt listener
      let resolve;
      const promise = new Promise((res) => {
        resolve = res;
      });

      this.emitter.emit('login_prompt_required', { done: resolve, params });
      const event = await promise;
      if (typeof event === 'object') {
        Object.assign(meta, event);   // merges `meta` object with result from login prompt event
      }
    }

    await this.flow.start(meta, context);
    await AuthorizationCodeFlow.PerformRedirect(this.flow);     // returns a promise that never resolves

    throw new TokenOrchestratorError('Fatal error, failed to perform redirect');    // this line should never be reached
  }

  /**
   * Determines if a valid token already exists in storage, otherwise requests a new token
   */
  public async getToken (params: TokenOrchestrator.AuthorizeParams = {}): Promise<Token | null> {
    const credential = await this.selectCredential(params);
    // token found in storage
    if (credential) {
      try {
        await credential.refreshIfNeeded();
        return credential.token;
      }
      catch (err) {
        // swallow refresh errors, attempt to request new token if refresh cannot succeed

        // emit error, mostly for debugging purposes
        if (err instanceof Error) {
          this.emitter.emit('error', { error: err });
        }

        // remove the token which couldn't be refreshed
        credential.remove();
      }
    }

    return this.requestToken(params);
  }
}

export namespace AuthorizationCodeFlowOrchestrator {
  export type Options = {
    avoidPrompting: boolean;
    emitBeforeRedirect: boolean;
    getOriginalUri: () => string;
    tags?: string[]
  };

  export type Init = Partial<Options>;

  export type Events = {
    'login_prompt_required': { done: () => void, params: TokenOrchestrator.AuthorizeParams };
  } & TokenOrchestrator.Events;
}
