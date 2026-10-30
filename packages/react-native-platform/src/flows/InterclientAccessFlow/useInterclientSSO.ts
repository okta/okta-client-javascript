/**
 * @module
 * @mergeModuleWith Flows
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Credential, CredentialError, type Token } from '../../core.ts';
import type { InterclientAccessFlow } from './InterclientAccessFlow.ts';


export type InterclientSSOHookOptions = {
  /**
   * Supplies the signed-in session's {@link Token}. Defaults to the default {@link Credential}'s token,
   * refreshed first if it's about to expire.
   */
  tokenProvider?: () => Promise<Token>;
  /** Path (relative to the web app) the user should land on once signed in */
  path?: string;
};

export type InterclientSSOHookState = {
  status: 'loading';
} | {
  status: 'ready';
  ssoURL: URL;
} | {
  status: 'error';
  error: Error;
};

export type InterclientSSOHookResult = InterclientSSOHookState & {
  /** `ssoURL` shaped as a `WebView` `source`. `null` until `ssoURL` is available */
  source: { uri: string } | null;
  /** Discards the current token and exchanges for a fresh one. `source` is cleared first, see {@link useInterclientSSO} */
  retry: () => void;
};


export async function defaultTokenProvider (): Promise<Token> {
  const credential = await Credential.getDefault();
  if (!credential) {
    throw new CredentialError('No default Credential found — sign in before starting Native-to-Web SSO');
  }

  await credential.refreshIfNeeded();
  return credential.token;
}

function toError (err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err), { cause: err });
}

/**
 * Exchanges the current session for a single-use interclient token and exposes the resulting URL as a `WebView` `source`.
 *
 * @remarks
 * The token is spent when a `WebView` first loads `source`, so its lifetime is tied to the `WebView` being mounted:
 * * `source` keeps the same object reference until a new exchange replaces it, so re-renders never hand the `WebView` a new `source`
 * * a new token is minted when the host component mounts, `flow` or `path` change, or `retry` is called. Each of these clears
 * `source` first, so a `WebView` rendered only while `source` is non-null is re-mounted with the new token rather than
 * having its `source` swapped while it's live
 *
 * Under StrictMode's dev-only effect re-run, the in-flight exchange is shared rather than repeated, so only one token is minted.
 * A change to `flow` or `path` while an exchange is in flight starts a second one, which `flow.launch` rejects as
 * "flow already in progress".
 *
 * Keep `flow` referentially stable (ex: `useMemo` or module scope), since a new `flow` triggers a new exchange.
 * `tokenProvider` is read through a ref, so it may be an inline function.
 *
 * @example
 * ```tsx
 * const { status, source, error, retry } = useInterclientSSO(flow, { path: '/messages' });
 *
 * if (status === 'error') return <ErrorView error={error} onRetry={retry} />;
 * if (!source) return <ActivityIndicator />;
 * return <WebView source={source} />;
 * ```
 */
export function useInterclientSSO (
  flow: InterclientAccessFlow,
  options: InterclientSSOHookOptions = {}
): InterclientSSOHookResult {
  const { tokenProvider = defaultTokenProvider, path } = options;

  const providerRef = useRef(tokenProvider);
  useEffect(() => {
    providerRef.current = tokenProvider;
  });

  const [state, setState] = useState<InterclientSSOHookState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  // Cancelling can't un-mint a token once `flow.launch` has sent its request, so StrictMode's dev-only
  // effect → cleanup → effect re-run shares the in-flight exchange rather than starting a second one.
  // Refs survive that simulated unmount but not a real one, so a re-mounted host still mints a fresh token.
  const exchangeRef = useRef<{
    flow: InterclientAccessFlow;
    path?: string;
    attempt: number;
    promise: Promise<URL>
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });

    let exchange = exchangeRef.current;
    if (!exchange || exchange.flow !== flow || exchange.path !== path || exchange.attempt !== attempt) {
      const promise = (async () => flow.launch(await providerRef.current(), path))();
      exchange = { flow, path, attempt, promise };
      exchangeRef.current = exchange;

      // only in-flight exchanges are shared: once settled, its URL may already be loaded (and spent) by a WebView
      const settled = exchange;
      const clear = () => {
        if (exchangeRef.current === settled) {
          exchangeRef.current = null;
        }
      };
      promise.then(clear, clear);
    }

    exchange.promise.then(
      ssoURL => {
        if (!cancelled) {
          setState({ status: 'ready', ssoURL });
        }
      },
      err => {
        if (!cancelled) {
          setState({ status: 'error', error: toError(err) });
        }
      }
    );

    return () => {
      cancelled = true;
    };
  }, [flow, path, attempt]);

  const retry = useCallback(() => setAttempt(n => n + 1), []);

  const ssoURL = state.status === 'ready' ? state.ssoURL : null;
  const source = useMemo(() => ssoURL ? { uri: ssoURL.href } : null, [ssoURL]);

  return { ...state, source, retry };
}
