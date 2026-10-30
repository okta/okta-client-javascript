/**
 * @module
 * @mergeModuleWith Flows
 */

import { AuthenticationFlowError } from '@okta/oauth2-flows';
import { AuthorizationCodeFlow } from './AuthorizationCodeFlow.ts';


/**
 * Companion, web-side half of Okta's Native-to-Web SSO. Handles both legs of the bootstrap page a
 * native app hands the WebView off to (e.g. `/native/sso`):
 *
 * 1. **Bootstrap** — the incoming URL carries an `interclient_token` (and optionally a `path` to
 *    return to once signed in). {@link InterclientAccessExchangeFlow.parseNativeHandoff} reads them from the URL, and
 *    {@link InterclientAccessExchangeFlow.PerformNativeHandoff} starts a normal {@link AuthorizationCodeFlow}, attaching
 *    the interclient token as an additional `/authorize` parameter and the desired `path` as `stateData`, then
 *    redirects to the Authorization Server.
 * 2. **Completion** — the Authorization Server redirects back with a normal authorization `code`.
 *    This is handled by the inherited, unmodified {@link AuthorizationCodeFlow.resume}, since this class
 *    extends {@link AuthorizationCodeFlow} directly — `resume()` behaves identically to ordinary sign-in
 *    (same PKCE/`AuthTransaction` handling), including restoring `path` from `context.meta`.
 *
 * @remarks
 * Both legs are served from the same URL (the flow's `redirectUri`), so a page has to tell them apart from the URL's
 * contents. {@link InterclientAccessExchangeFlow.parseNativeHandoff} returns `null` when the URL isn't a handoff,
 * which is the cue to call `resume()` instead.
 *
 * There is no separate "resume" implementation here — sharing {@link AuthorizationCodeFlow.resume}
 * unchanged (rather than reimplementing it) guarantees this flow completes identically to ordinary
 * sign-in from a consuming application's perspective.
 *
 * @example
 * ```typescript
 * const flow = new InterclientAccessExchangeFlow(client, {
 *   redirectUri: `${window.location.origin}/native/sso`
 * });
 *
 * // reads `window.location`, `null` if this isn't the native app's handoff
 * const handoff = InterclientAccessExchangeFlow.parseNativeHandoff();
 *
 * if (handoff) {
 *   // bootstrap leg
 *   await InterclientAccessExchangeFlow.PerformNativeHandoff(flow, handoff);
 * }
 * else {
 *   // completion leg
 *   const { token, context } = await flow.resume();
 *   // navigate to `context.path`
 * }
 * ```
 *
 * @see {@link https://developer.okta.com/docs/guides/native-to-web-sso/main/ | Okta Documentation: Native to Web SSO}
 */
export class InterclientAccessExchangeFlow extends AuthorizationCodeFlow {
  /**
   * Reads the native app's handoff out of a URL
   *
   * @remarks
   * The names and locations read here (`token` in the hash, falling back to the query, and `path` in the query) mirror what
   * `InterclientAccessFlow.launch()` in `@okta/react-native-platform` builds.
   *
   * Returns `null` when `url` isn't a handoff: it has no `token`, or it carries an authorization response (`code`, `state` or
   * `error`), in which case it's the redirect back from the Authorization Server and belongs to {@link AuthorizationCodeFlow.resume}.
   *
   * A `path` which isn't root-relative (ex: `//example.com`) is dropped, since it's intended to be used as an in-app navigation target.
   *
   * @param url - Defaults to the current page, `window.location.href`
   */
  static parseNativeHandoff (url: string | URL = window.location.href): InterclientAccessExchangeFlow.NativeHandoffParams | null {
    const { searchParams, hash } = new URL(url);

    if (searchParams.has('code') || searchParams.has('state') || searchParams.has('error')) {
      return null;
    }

    // `.slice(1)` drops the leading `#` character so `URLSearchParams` can be leveraged to parse the hash value
    const interclientToken = new URLSearchParams(hash.slice(1)).get('token') ?? searchParams.get('token');
    if (!interclientToken) {
      return null;
    }

    const path = searchParams.get('path') ?? undefined;
    return { interclientToken, path };
  }

  /**
   * Starts the bootstrap leg: begins a normal {@link AuthorizationCodeFlow}, attaching the interclient
   * token as an `/authorize` parameter and `path` as `stateData`, then redirects to the Authorization Server.
   *
   * @remarks
   * This method returns a `Promise` that will never fulfill; a browser redirect will occur first
   *
   * If the token came from the current page's URL, it's removed from the address bar (and so the WebView's history) before the redirect.
   *
   * @param flow - The {@link InterclientAccessExchangeFlow} instance to hand off with
   * @param params - Defaults to {@link InterclientAccessExchangeFlow.parseNativeHandoff | parseNativeHandoff()}, parsed from `window.location`
   * @param params.interclientToken - The interclient token received from the native app
   * @param params.path - Optional path the user should land on once signed in, restored via `context.path` on {@link AuthorizationCodeFlow.resume}
   * @throws {@link OAuth2Flows!AuthenticationFlowError | AuthenticationFlowError} with `code: 'MISSING_INTERCLIENT_TOKEN'` if no `params`
   * are provided and the current URL isn't a handoff
   */
  static async PerformNativeHandoff (
    flow: InterclientAccessExchangeFlow,
    params?: InterclientAccessExchangeFlow.NativeHandoffParams
  ): Promise<void> {
    if (!flow.inProgress) {
      const handoff = params ?? InterclientAccessExchangeFlow.parseNativeHandoff();
      if (!handoff) {
        throw new AuthenticationFlowError('Failed to parse an interclient `token` from the current url', {
          code: 'MISSING_INTERCLIENT_TOKEN'
        });
      }

      // eslint-disable-next-line camelcase
      await flow.start({ path: handoff.path }, {}, { interclient_token: handoff.interclientToken });

      // after `start` succeeds, so a failed attempt leaves the url intact and a reload can retry
      InterclientAccessExchangeFlow.clearHandoffFromLocation(handoff.interclientToken);
    }

    return AuthorizationCodeFlow.PerformRedirect(flow);
  }

  /**
   * @internal
   * Removes `token` from the address bar when it's the one `interclientToken` came from. Applies to a handoff parsed
   * by the caller as well as one parsed here, and leaves the url alone for a token which came from somewhere else
   */
  private static clearHandoffFromLocation (interclientToken: string): void {
    if (InterclientAccessExchangeFlow.parseNativeHandoff()?.interclientToken !== interclientToken) {
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.delete('token');

    const hashParams = new URLSearchParams(url.hash.slice(1));
    if (hashParams.has('token')) {
      hashParams.delete('token');
      const hash = hashParams.toString();
      url.hash = hash ? `#${hash}` : '';
    }

    history.replaceState(null, document.title, url.pathname + url.search + url.hash);
  }
}

export namespace InterclientAccessExchangeFlow {
  export type NativeHandoffParams = {
    /** The single-use interclient token received from the native app */
    interclientToken: string;
    /** Optional path the user should land on once signed in */
    path?: string;
  };
}
