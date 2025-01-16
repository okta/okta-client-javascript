import { Token, EventEmitter } from '@okta/auth-foundation';
import { AuthorizationCodeFlow } from '@okta/spa-oauth2-flows';
import { Credential } from '../../Credential';
import { TokenOrchestrator } from '../TokenOrchestrator';

/** @internal */
const defaultOptions: AuthorizationCodeFlowOrchestrator.Options = {
  handleSilently: false,
  promptBeforeRedirect: true
};

// TODO: move this to type
const PROMPT_REQUIRED = 'PROMPT_REQUIRED';

export class HostOrchestratorEventEmitter extends EventEmitter {
  duplicateHosts (id: string, duplicateId: string) {
    this.emit('duplicate_host', { id, duplicateId });
  }

  loginPromptRequired (details: Record<string, any>) {
    this.emit('login_prompt_required', details);
  }
}

/**
 * An implementation of {@link CredentialOrchestrator} leveraging
 * {@link https://developer.okta.com/docs/concepts/oauth-openid/#authorization-code-flow-with-pkce-flow | Authorization Code Flow }
 * @public
 */
export class AuthorizationCodeFlowOrchestrator extends TokenOrchestrator {
  protected authParams: TokenOrchestrator.OAuth2Params;
  options: AuthorizationCodeFlowOrchestrator.Options = defaultOptions;

  constructor (
    public readonly flow: AuthorizationCodeFlow,
    init: AuthorizationCodeFlowOrchestrator.Init
  ) {
    const { handleSilently, promptBeforeRedirect, ...authOptions } = init;
    super();
    this.options = {
      handleSilently: handleSilently ?? defaultOptions.handleSilently,
      promptBeforeRedirect: promptBeforeRedirect ?? defaultOptions.promptBeforeRedirect,
    };
    this.authParams = authOptions;
  }

  protected selectCredential (options: TokenOrchestrator.OAuth2Params): Credential | null {
    if (options.scopes === undefined) {
      return null;
    }
    return Credential.find(meta => options.scopes!.every((scp) => meta.scopes.includes(scp)))[0] ?? null;
  }

  public async getToken (options: TokenOrchestrator.OAuth2Params): Promise<Token | null> {
    const credential = this.selectCredential(options);
    // token found in storage
    if (credential) {
      // TODO: what if refresh fails?
      await credential.refreshIfNeeded();
      return credential.token;
    }

    // request token
    if (!this.options.handleSilently) {
      if (this.options.promptBeforeRedirect) {
        // TODO: this needs to be a blocking operation, maybe event emitter is not sufficient?
        console.log('called');
        // @ts-expect-error - temporary for dev
        this.emitter.emit(PROMPT_REQUIRED, options);
        return null;
      }
      else {
        // TODO: set originalUri???
        await this.flow.start({ originalUri: new URL(window.location.href).pathname });
        await AuthorizationCodeFlow.PerformRedirect(this.flow);
        return null;
      }
    }
    else {
      console.log('there');
      const { token } = await AuthorizationCodeFlow.PerformSilently(this.flow);
      const newCredential = Credential.store(token);
      return newCredential.token;
    }
  }
}

export namespace AuthorizationCodeFlowOrchestrator {
  export type Options = {
    handleSilently: boolean;
    promptBeforeRedirect: boolean;
  };

  export type Init = Partial<Options> & Required<TokenOrchestrator.OAuth2Params>;

  export type Events = 'PROMPT_REQUIRED';
}
