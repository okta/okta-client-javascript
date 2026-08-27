/**
 * @module
 * @mergeModuleWith Flows
 */

import { AuthorizationCodeFlow } from './AuthorizationCodeFlow.ts';
import { randomBytes } from '@okta/auth-foundation/core';


/**
 * Companion, web-side half of Okta's Native-to-Web SSO. Handles both legs of the bootstrap page a
 * native app hands the WebView off to (e.g. `/native/sso`):
 *
 * 1. **Bootstrap** — the incoming URL carries an `interclient_token` (and optionally a `path` to
 *    return to once signed in). {@link InterclientAccessExchangeFlow.PerformNativeHandoff} starts a
 *    normal {@link AuthorizationCodeFlow}, attaching the interclient token as an additional `/authorize`
 *    parameter and the desired `path` as `stateData`, then redirects to the Authorization Server.
 * 2. **Completion** — the Authorization Server redirects back with a normal authorization `code`.
 *    This is handled by the inherited, unmodified {@link AuthorizationCodeFlow.resume}, since this class
 *    extends {@link AuthorizationCodeFlow} directly — `resume()` behaves identically to ordinary sign-in
 *    (same PKCE/`AuthTransaction` handling), including restoring `path` from `context.meta`.
 *
 * @remarks
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
 * const params = new URLSearchParams(window.location.search);
 * const interclientToken = params.get('token');
 *
 * if (interclientToken) {
 *   // bootstrap leg
 *   await InterclientAccessExchangeFlow.PerformNativeHandoff(flow, {
 *     interclientToken,
 *     path: params.get('path') ?? undefined
 *   });
 * }
 * else {
 *   // completion leg
 *   const { token, context } = await flow.resume(window.location.href);
 *   // navigate to `context.path`
 * }
 * ```
 *
 * @see {@link https://developer.okta.com/docs/guides/native-to-web-sso/main/ | Okta Documentation: Native to Web SSO}
 */
export class InterclientAccessExchangeFlow extends AuthorizationCodeFlow {

  // protected prepare (context: Partial<AuthorizationCodeFlow.Context> = {}): Promise<AuthorizationCodeFlow.Context> {
  //   return {
  //     ...context,
  //     // @ts-ignore
  //     redirectUri: this.redirectUri,
  //     state: context.state ?? randomBytes()
  //   };
  // }

  /**
   * Starts the bootstrap leg: begins a normal {@link AuthorizationCodeFlow}, attaching the interclient
   * token as an `/authorize` parameter and `path` as `stateData`, then redirects to the Authorization Server.
   *
   * @remarks
   * This method returns a `Promise` that will never fulfill; a browser redirect will occur first
   *
   * @param flow - The {@link InterclientAccessExchangeFlow} instance to hand off with
   * @param params.interclientToken - The interclient token received from the native app
   * @param params.path - Optional path the user should land on once signed in, restored via `context.path` on {@link AuthorizationCodeFlow.resume}
   */
  static async PerformNativeHandoff (
    flow: InterclientAccessExchangeFlow,
    { interclientToken, path }: { interclientToken: string; path?: string }
  ): Promise<void> {
    if (!flow.inProgress) {
      await flow.start({ path }, {}, { interclient_token: interclientToken });
    }

    return AuthorizationCodeFlow.PerformRedirect(flow);
  }
}
