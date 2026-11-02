import type { ComponentRef, ReactElement, Ref } from 'react';
import { ActivityIndicator, Text, View, StyleSheet } from 'react-native';
import { WebView, type WebViewProps } from 'react-native-webview';
import type { Token } from './core.ts';
import type { InterclientAccessFlow } from './flows.ts';
import { useInterclientSSO } from './flows/InterclientAccessFlow/useInterclientSSO.ts';


export type SSOWebViewProps = {
  /** {@link InterclientAccessFlow} instance to be used to obtain the SSO token used to establish a web session. */
  flow: InterclientAccessFlow;
  /** A React `ForwardRef` to the underline `WebView` instance rendered within this component. */
  ref?: Ref<ComponentRef<typeof WebView>>;
  /** 
   * This method is used to obtain a token used to perform the Native-to-Web SSO flow (aka {@link InterclientAccessFlow}).
   * 
   * @remarks
   * A default implementation is provided, which will use {@link Credential.getDefault} to source a {@link Token} and will
   * invoke {@link Credential.refreshIfNeeded} before returning.
   */
  tokenProvider?: () => Promise<Token>;
  /** Path (relative to the web app) the user should land on once signed in */
  path?: string;
  // eslint-disable-next-line no-unused-vars
  renderSSOError?: (error: Error, retry: () => void) => ReactElement;
} & Omit<WebViewProps, 'source' | 'renderError'>;


// Based on https://github.com/react-native-webview/react-native-webview/blob/054572b187824084aa19e709f5d2f569a33a6f4a/src/WebView.styles.ts
const styles = StyleSheet.create({
  loadingOrErrorView: {
    position: 'absolute',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    width: '100%',
    backgroundColor: 'white',
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 2,
  },
  errorTextTitle: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 10,
  },
});

function defaultRenderLoading () {
  return (
    <View style={styles.loadingOrErrorView}>
      <ActivityIndicator size="large" />
    </View>
  );
}

function defaultRenderSSOError (error: Error) {
  return (
    <View style={styles.loadingOrErrorView}>
      <Text style={styles.errorTextTitle}>{'Error loading page'}</Text>
      <Text style={styles.errorText}>{`Error: ${error.message}`}</Text>
    </View>
  );
}

/**
 * A `WebView` which loads a web app already signed in with the current native session (Native-to-Web SSO)
 *
 * @remarks
 * The interclient token is single-use and is spent when the `WebView` first loads it, so the `WebView` is only
 * rendered once the exchange completes. See {@link useInterclientSSO} for when a new token is minted.
 */
export function SSOWebView ({
  flow,
  ref,
  tokenProvider,
  path,
  renderLoading = defaultRenderLoading,
  startInLoadingState = true,
  renderSSOError = defaultRenderSSOError,
  ...webviewProps
}: SSOWebViewProps) {
  const sso = useInterclientSSO(flow, { tokenProvider, path });

  if (sso.status === 'error') {
    return renderSSOError(sso.error, sso.retry);
  }

  if (!sso.source) {
    return renderLoading();
  }

  return (
    <WebView
      {...webviewProps}
      ref={ref}
      startInLoadingState={startInLoadingState}
      source={sso.source}
    />
  );
}
