import type { ComponentRef, ComponentType, ReactElement, Ref } from 'react';
import { ActivityIndicator, Text } from 'react-native';
import { WebView, type WebViewProps } from 'react-native-webview';
import type { Token } from './core.ts';
import type { InterclientAccessFlow } from './flows.ts';
import { useInterclientSSO } from './flows/InterclientAccessFlow/useInterclientSSO.ts';


export type SSOWebViewErrorProps = {
  error: Error;
  /** Discards the failed attempt and exchanges for a fresh interclient token */
  retry: () => void;
};

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
  /**
   * A {@link ReactElement} to render while performing the SSO flow. Defaults to React Native's {@link ActivityIndicator | <ActivityIndicator />}.
   */
  loadingComponent?: ReactElement;
  /**
   * A {@link Component} which will be rendered if an error occurs while performing the SSO flow.
   */
  ErrorComponent?: ComponentType<SSOWebViewErrorProps>;
} & Omit<WebViewProps, 'source'>;


// Defined at module scope so its identity is stable across renders (an inline default would remount on every render)
function DefaultErrorComponent ({ error }: SSOWebViewErrorProps) {
  return <Text>{error.message}</Text>;
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
  loadingComponent = <ActivityIndicator size="large" />,
  ErrorComponent = DefaultErrorComponent,
  ...webviewProps
}: SSOWebViewProps) {
  // not destructured, so `sso.status` narrows `sso.error`
  const sso = useInterclientSSO(flow, { tokenProvider, path });

  if (sso.status === 'error') {
    return <ErrorComponent error={sso.error} retry={sso.retry} />;
  }

  if (!sso.source) {
    return loadingComponent;
  }

  return (
    <WebView
      {...webviewProps}
      ref={ref}
      source={sso.source}
    />
  );
}
