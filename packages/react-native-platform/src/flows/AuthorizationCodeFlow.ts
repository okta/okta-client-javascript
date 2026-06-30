import { OAuth2Error } from '@okta/auth-foundation/core';
import {
  AuthTransaction,
  AuthorizationCodeFlow as AuthorizationCodeFlowBase,
  AuthenticationFlowError
} from '@okta/oauth2-flows';
import {
  openAuthSession,
  BrowserSessionOptions,
  DEFAULT_OPTIONS as defaultBrowserSessionOpts
} from '../BrowserSession/index.ts';


export class AuthorizationCodeFlow extends AuthorizationCodeFlowBase {

  public static defaultBrowserSessionOptions: BrowserSessionOptions = {
    ...defaultBrowserSessionOpts,
    ephemeralSession: true
  };
  
  /**
   * TODO: complete doc
   * 
   * defaults `ephemeralSession` to `true`. OIDC Logout cannot be completed in an React Native context
   * because Android chrome windows require user interaction (is not a part of the current OIDC logout flow)
   */
  static async PerformBrowserSignIn (flow: AuthorizationCodeFlow): Promise<AuthorizationCodeFlow.BrowserSignInResult> {
    try {
      if (!flow.inProgress) {
        await flow.start();
      }

      // `.context` cannot be null if `.isAuthenticating` is true (after `.start` is called)
      const transaction = new AuthTransaction(flow.context!);
      await transaction.save();

      // `.authorizeUrl` cannot be null after `.start()` as been called
      const authorizeUrl = flow.authorizeUrl!;

      let result: Awaited<ReturnType<typeof openAuthSession>>;
      try {
        // open window using NativeBridge
        result = await openAuthSession(
          authorizeUrl.href,
          flow.redirectUri,
          { ...AuthorizationCodeFlow.defaultBrowserSessionOptions }
        );
      }
      catch (err) {
        // catches bridge-related error
        throw new AuthenticationFlowError('Failed to open native browser', { cause: err });
      }

      // happy path
      if (result.type === 'success') {
        const { token, context } = await flow.resume(result.url);
        return { token, context, completed: true };
      }

      // at this point, browser window was closed
      return { completed: false, reason: 'closed' };
    }
    catch (err) {
      // distinguish OAuth2 errors from programmatic errors 
      if (err instanceof OAuth2Error) {
        return { completed: false, reason: 'error', error: err };
      }

      const error = err instanceof Error ? err : new AuthenticationFlowError('browser sign in failed', { cause: err });
      return { completed: false, reason: 'failed', error };
    }
    finally {
      flow.reset();
    }
  }

}

export namespace AuthorizationCodeFlow {
  export type Result = AuthorizationCodeFlowBase.Result;
  /**
   * completed: true - happy path, returns token and request context
   * completed: false:
   *   - reason: 'closed' - Browser window was closed by user
   *   - reason: 'error'  - Authorization Code flow resulted in an OAuth error response
   *   - reason: 'failed' - Error was thrown during execution
   */
  export type BrowserSignInResult = 
    (Result & { completed: true }) |
    { completed: false; reason: 'closed' } |
    { completed: false; reason: 'failed', error: Error } |
    { completed: false; reason: 'error', error: OAuth2Error };
}
