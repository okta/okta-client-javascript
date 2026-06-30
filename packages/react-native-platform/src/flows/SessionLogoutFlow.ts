/**
 * @packageDocumentation
 * @internal
 * 
 * Not yet implemented. Complexity of implementation may not be worth it
 * 
 * Cannot use HTML-based auto-submit forms. Custom Chrome Tabs cannot open data URLs
 * `AuthTabIntent` cannot be used with RN without a "Trampoline Activity"
 *   - https://developer.android.com/reference/androidx/browser/auth/AuthTabIntent#summary
 *   - `AuthTabIntent` requires a registration call which needs to be performed BEFORE activity creation, 
 *         not possible in React Native
 * 
 * Currently solution: default to ephemeral sessions to avoid requiring an IDP logout
 */


import {
  AuthenticationFlowError,
  SessionLogoutFlow as SessionLogoutFlowBase,
} from '@okta/oauth2-flows';
import { openAuthSession } from '../BrowserSession/index.ts';


export class SessionLogoutFlow extends SessionLogoutFlowBase {

  static async PerformBrowserLogout (logoutUrl: URL): Promise<SessionLogoutFlow.BrowserLogoutResult> {
    try {
      console.log('logoutURL', logoutUrl);
      // const baseUrl = new URL(logoutUrl.origin + logoutUrl.pathname);

      const postLogoutRedirectUri = logoutUrl.searchParams.get('post_logout_redirect_uri');
      console.log('postLogoutRedirect: ', postLogoutRedirectUri);
      if (!postLogoutRedirectUri) {
        throw new AuthenticationFlowError('No `post_logout_redirect_uri` provided');
      }

      // Open the form in a native browser - it will auto-submit via POST
      // and redirect to postLogoutRedirectUri when complete
      console.log('URL: ', logoutUrl.href);
      const result = await openAuthSession(logoutUrl.href, postLogoutRedirectUri);

      console.log('browser result', result);

      // User completed the logout flow and returned via the redirect URI
      if (result.type === 'success') {
        return { type: 'success', url: result.url };
      }

      // Browser was closed without completing logout
      return { type: 'cancel' };
    }
    catch (err) {
      console.log('Something went wrong', err);

      // Distinguish bridge-related errors from logout failures
      const error = err instanceof Error ? err : new Error('Browser logout failed');
      return { type: 'error', error };
    }
  }
}

export namespace SessionLogoutFlow {
  export type BrowserLogoutResult =
    | { type: 'success'; url: string }
    | { type: 'cancel' }
    | { type: 'error'; error: Error };
}
