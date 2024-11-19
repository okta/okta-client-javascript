import { Token } from '@okta/auth-foundation';
import { AuthorizationCodeFlow } from '@okta/spa-oauth2-flows';
import { Credential } from '../../Credential';
import { CredentialOrchestrator } from '../CredentialOrchestrator';

/** @internal */
const defaultOptions: AuthorizationCodeFlowOrchestrator.Options = {
  handleSilently: false,
  promptBeforeRedirect: true
};

// TODO: move this to type
const PROMPT_REQUIRED = 'PROMPT_REQUIRED';

/**
 * An implementation of {@link CredentialOrchestrator} leveraging
 * {@link https://developer.okta.com/docs/concepts/oauth-openid/#authorization-code-flow-with-pkce-flow | Authorization Code Flow }
 * @public
 */
export class AuthorizationCodeFlowOrchestrator extends CredentialOrchestrator {
  constructor (
    public readonly flow: AuthorizationCodeFlow,
    private options: Partial<AuthorizationCodeFlowOrchestrator.Options> = {}
  ) {
    super();
    this.options = {...defaultOptions, ...options};
  }

  protected selectCredential (options: CredentialOrchestrator.AuthOptions): Credential | null {
    return Credential.find(meta => options.scopes.every((scp) => meta.scopes.includes(scp)))[0] ?? null;
  }

  public async getToken (options: CredentialOrchestrator.AuthOptions): Promise<Token | null> {
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

  // TODO: implement dpop
  public getDPoPSignature (options: CredentialOrchestrator.DPoPOptions): Promise<Request> {
    return super.getDPoPSignature(options);
  }
}

export namespace AuthorizationCodeFlowOrchestrator {
  export type Options = {
    handleSilently: boolean;
    promptBeforeRedirect: boolean;
  };

  export type Events = 'PROMPT_REQUIRED';
}
