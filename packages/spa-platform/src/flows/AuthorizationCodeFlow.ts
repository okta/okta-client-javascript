import {
  type OAuth2ErrorResponse,
  isOAuth2ErrorResponse,
  OAuth2Error
} from '@okta/auth-foundation';
import {
  AuthTransaction,
  AuthorizationCodeFlow as AuthorizationCodeFlowBase,
  AuthenticationFlowError
} from '@okta/oauth2-flows';
import { BrowserTransactionStorage } from './TransactionStorage.ts';


/** @internal */
type PostMessageListenerOptions = {
  state: string;
  expectedOrigin: string;
  timeout?: number;
};

/** @internal */
function bindOktaPostMessageListener ({
  state,
  expectedOrigin,
  timeout = 120000
}: PostMessageListenerOptions): Promise<AuthorizationCodeFlow.RedirectValues | OAuth2ErrorResponse>
{
  let handler: (evt: MessageEvent<any>) => void;
  let timeoutId: ReturnType<typeof setTimeout>;
  return (new Promise<AuthorizationCodeFlow.RedirectValues | OAuth2ErrorResponse>((resolve, reject) => {
    handler = function (e) {
      if (e.origin !== expectedOrigin) {
        // If a message is received from an origin other than the issuer (authorize url), ignore it
        return;
      }

      if (!e.data || e.data.state !== state) {
        // A message not meant for us
        return;
      }

      resolve(e.data);
    };

    window.addEventListener('message', handler);

    timeoutId = setTimeout(() => {
      // TODO: timeout
      reject(new AuthenticationFlowError('Authentication flow timed out'));
    }, timeout);
  }))
  .finally(() => {
    clearTimeout(timeoutId);
    window.removeEventListener('message', handler);
  });
}

// updates storage impl for AuthTransaction
AuthTransaction.storage = new BrowserTransactionStorage();

export class AuthorizationCodeFlow extends AuthorizationCodeFlowBase {

  /**
   * Performs a browser full-page redirect to the `Authorization Server` `/authorize` endpoint.
   * Once authentication is successful, the user will be redirected back to the provided `redirectUri`
   * 
   * @group Authorize Methods
   * 
   * @remarks
   * This method returns a `Promise` that will never fulfill; a browser redirect will occur first
   * 
   * @see
   * {@link AuthorizationCodeFlow.resume}
   */
  static async PerformRedirect (flow: AuthorizationCodeFlow): Promise<void> {
    if (!flow.inProgress) {
      // starts flow if it hasn't been started already
      await flow.start();
    }

    // `.context` cannot be null if `.isAuthenticating` is true (after `.start` is called)
    const transaction = new AuthTransaction(flow.context!);
    await transaction.save();

    return new Promise(() => {
      // `.authorizeUrl` cannot be null after `.start` is called
      window.location.assign(flow.authorizeUrl!);
    });
  }

  /** @internal */
  protected static async prepareOktaPostMessage (flow: AuthorizationCodeFlow) {
    if (!flow.inProgress) {
      // starts flow if it hasn't been started already
      await flow.start();
    }

    // `.authorizeUrl` and `.context` cannot be null after `.start` is called
    // (okta_post_message does not involve a browser redirect)
    const authorizeUrl = flow.authorizeUrl!;
    const context = flow.context!;

    // append okta post message param
    authorizeUrl.searchParams.set('response_mode', 'okta_post_message');

    return { authorizeUrl, context };
  }

  /** @internal */
  protected static async processOktaPostMessage (
    flow: AuthorizationCodeFlow,
    result: Awaited<ReturnType<typeof bindOktaPostMessageListener>>,
    context: AuthorizationCodeFlow.Context
  ) {
    if (isOAuth2ErrorResponse(result)) {
      throw new OAuth2Error(result);
    }

    const { code, state } = result;
    if (context.state !== state) {
      throw new AuthenticationFlowError('OAuth `state` values do not match');
    }

    return flow.exchangeCodeForTokens(code, context);
  }

  /**
   * Fulfills the `/authorize` request within a hidden iframe and therefore does *not* require a redirect.
   * This requires an existing cookie-based session with the IDP and is susceptible to third-party cookie restrictions.
   *
   * @group Authorize Methods
   *
   * @remarks
   * This approach is not recommended for most common use cases and may be deprecated in the future.
   * Use {@link AuthorizationCodeFlow.PerformRedirect} instead
   *
   * @returns
   * Returns a {@link Platform.Token | Token} and the {@link AuthorizationCodeFlow.Context} used to request the token
   *
   * @see
   * - {@link https://auth0.com/docs/authenticate/login/configure-silent-authentication | Silent Authentication}
   * - {@link https://developers.google.com/privacy-sandbox/cookies | Third-party Cookie Deprecation}
   */
  static async PerformSilently (flow: AuthorizationCodeFlow): Promise<AuthorizationCodeFlow.Result> {
    const { authorizeUrl, context } =  await this.prepareOktaPostMessage(flow);
    authorizeUrl.searchParams.set('prompt', 'none');

    // load iframe
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = authorizeUrl.href;

    document.body.appendChild(iframe);

    try {
      const state = context.state;
      const oktaPostMessageResult = await bindOktaPostMessageListener({ state, expectedOrigin: authorizeUrl.origin });
      return await this.processOktaPostMessage(flow, oktaPostMessageResult, context);
    }
    finally {
      flow.reset();

      // finally, remove iframe
      if (document.body.contains(iframe)) {
        iframe.parentElement?.removeChild(iframe);
      }
    }
  }

  /**
   * Read carefully before use. This method (and popup pattern at large) has quite a few "gotchas"
   *
   * Fulfills `/authorize` requests in a popup window. Not necessarily recommended for primary authentication flows,
   * but can be useful for step up authentication flows.
   *
   * @group Authorize Methods
   *
   * @remarks
   * Utilizing external IDPs in a popup window may be susceptible to the IDP's `Cross-Origin-Opener-Policy`. Depending on their policy value,
   * the loading the IDP in a popup window may cause the popup window to create a new browsing context group (BCG), seperate from the main
   * browser window. The authentication flow will be unable to complete if this occurs. It's recommended to avoid using this method (and a popup
   * in general) when utilizing external IDPs.
   *
   * {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Opener-Policy | Cross-Origin-Opener-Policy}
   * {@link https://developer.mozilla.org/en-US/docs/Glossary/Browsing_context | Browsing Context Group}
   *
   * @param flow - instance of {@link AuthorizationCodeFlow} to be used
   *
   * @param popupWindow - Optionally, a `Window` object (representing a popup window) can be provided.
   * Providing a popup reference can be useful when control over the popup's attributes, like name and size, is required.
   *
   * In addition, the popup window will first load the base route (`/`) of the web application. Some browser implement heustistics which
   * can block popups spawned from `async` processes. Loading the base route before navigating to `/authorize` helps reduce the likelihood
   * the popup gets blocked. To override this behavior, provide a popup reference
   *
   * @returns {@link AuthorizationCodeFlow.PopupResult}
   * On success, the return value will be `{ completed: true, token: {@link Platform.Token | Token}, context: {@link AuthorizationCodeFlow.Context} }`
   * On failure, the return value will be `{ completed: false; reason: 'closed' | 'blocked' }`
   *   - `'closed'` indicates the user manually closed the popup window
   *   - `'blocked'` indicates the popup window was unable to be opened (presumably by a popup blocker or browser heustistics)
   */
  static async PerformInPopup (flow: AuthorizationCodeFlow, popupWindow?: Window): Promise<AuthorizationCodeFlow.PopupResult> {
    let popup: Window | null = null;
    let interval: ReturnType<typeof setTimeout> | undefined;

    const pollForPopupClosure = (): Promise<{ completed: false, reason: 'closed' }> => {
      return new Promise((resolve) => {
        // checks if user has manually closed the popup window on an interval
        interval = setInterval(() => {
          if (popup && popup.closed) {
            resolve({ completed: false, reason: 'closed' });
          }
        }, 100);
      });
    };

    try { 
      const { authorizeUrl, context } =  await this.prepareOktaPostMessage(flow);
      authorizeUrl.searchParams.set('display', 'popup');

      // verifies `popupWindow` param is a reference to a Popup Window and some other Window instance
      //
      // "the value of the visible property is now false if this Window is a popup, and true otherwise"
      // -- via https://developer.mozilla.org/en-US/docs/Web/API/Window/menubar
      if (popupWindow && (popupWindow.opener !== window || popupWindow.menubar.visible)) {
        throw new AuthenticationFlowError('window reference provided is not a popup');
      }

      // Opens popup
      // Some browser block popup windows spawned from async processes. To avoid, initially load the popup window with the same
      // origin as the web app, then navigate the popup to /authorize to reduce the likelihood of being blocked by browser heuristics
      popup = popupWindow ?? window.open('/foo', 'Sign In', 'popup');

      // may be null if blocked by popup blocker
      if (popup === null) {
        return { completed: false, reason: 'blocked' };
      }

      // navigates popup to `/authorize` (see comment at top of function for context)
      popup?.location.assign(authorizeUrl);

      // trigger the flow in a popup window (this will set `popup`, if window opens successfully)
      const state = context.state;

      // race between popup being closed or happy path (successful authentication)
      const oktaPostMessageResult = await Promise.race([
        // happy path promise, resolving indicates success (appends `closed: false` to result to appease TS)
        bindOktaPostMessageListener({ state, expectedOrigin: authorizeUrl.origin }).then(resp => ({ ...resp, completed: true })),
        // polls `popup.closed` and will resolve if the popup window is closed before success
        pollForPopupClosure()
      ]);

      if (!oktaPostMessageResult.completed) {
        return { completed: false, reason: 'closed' };
      }

      const result = await this.processOktaPostMessage(flow, oktaPostMessageResult, context);
      return { ...result, completed: true };
    }
    finally {
      flow.reset();

      if (interval) {
        clearInterval(interval);
      }

      if (popup !== null) {
        (popup as Window).close();
      }
    }
  }
}

export namespace AuthorizationCodeFlow {
  export type RedirectValues = AuthorizationCodeFlowBase.RedirectValues;
  export type Result = AuthorizationCodeFlowBase.Result;
  export type Context = AuthorizationCodeFlowBase.Context;
  export type PopupResult = (Result & { completed: true }) | { completed: false; reason: 'closed' | 'blocked' };
}