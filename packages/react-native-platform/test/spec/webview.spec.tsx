import { createRef, type ComponentRef, type Ref } from 'react';
import { Text } from 'react-native';
import { render, screen, act } from '@testing-library/react-native';
import type { WebView } from 'react-native-webview';
import type { Token } from '@okta/auth-foundation/core';
import { Credential } from 'src/core';
import { SSOWebView } from 'src/webview';
import type { InterclientAccessFlow } from 'src/flows/InterclientAccessFlow/InterclientAccessFlow';

// Only the default `tokenProvider` reaches `Credential`; specs for it set `getDefault` themselves
jest.mock('src/core', () => ({
  Credential: { getDefault: jest.fn() },
  CredentialError: class CredentialError extends Error {}
}));

// The real `WebView` needs its native component. This stand-in renders a bare host element carrying every prop it receives (so
// specs can read `source`, `style`, etc. off `getByTestId('webview')`) and forwards `ref` to an imperative handle, like the real one
jest.mock('react-native-webview', () => {
  const { createElement, useImperativeHandle } = jest.requireActual<typeof import('react')>('react');

  const WebView = ({ ref, ...props }: { ref?: Ref<unknown> } & Record<string, unknown>) => {
    useImperativeHandle(ref, () => ({ reload: jest.fn() }), []);
    return createElement('MockWebView', { ...props, testID: 'webview' });
  };

  return { WebView };
});

const SSO_URL = 'https://app.example.com/native/sso#token=';

function deferred<T> () {
  // eslint-disable-next-line no-unused-vars
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(res => {
    resolve = res;
  });
  return { promise, resolve };
}

// A stand-in for `InterclientAccessFlow` whose `launch` mints a distinct URL per call, so specs can tell exchanges apart
function setup () {
  let minted = 0;
  const token = {} as Token;
  const launch = jest.fn(async () => new URL(`${SSO_URL}t${++minted}`));
  const tokenProvider = jest.fn(async () => token);

  return { flow: { launch } as unknown as InterclientAccessFlow, launch, token, tokenProvider };
}

const sourceOf = () => screen.getByTestId('webview').props.source;

describe('SSOWebView', () => {
  describe('loading', () => {
    it('renders `renderLoading` instead of the WebView until the exchange completes', async () => {
      const { flow, launch, tokenProvider } = setup();
      const exchange = deferred<URL>();
      launch.mockReturnValueOnce(exchange.promise);

      const renderLoading = () => (<Text testID="loading">Loading</Text>);
      await render(
        <SSOWebView flow={flow} tokenProvider={tokenProvider} renderLoading={renderLoading} />
      );

      expect(screen.getByTestId('loading')).toBeTruthy();
      expect(screen.queryByTestId('webview')).toBeNull();

      await act(async () => {
        exchange.resolve(new URL(`${SSO_URL}pending`));
      });

      expect(await screen.findByTestId('webview')).toBeTruthy();
      expect(screen.queryByTestId('loading')).toBeNull();
      expect(sourceOf()).toEqual({ uri: `${SSO_URL}pending` });
    });

    it('renders an `ActivityIndicator` by default', async () => {
      const { flow, launch, tokenProvider } = setup();
      launch.mockReturnValueOnce(deferred<URL>().promise);

      await render(<SSOWebView flow={flow} tokenProvider={tokenProvider} />);

      expect(screen.container.queryAll(instance => instance.type === 'ActivityIndicator')).toHaveLength(1);
      expect(screen.queryByTestId('webview')).toBeNull();
    });
  });

  describe('exchange', () => {
    it('loads the SSO URL as the WebView `source`', async () => {
      const { flow, launch, token, tokenProvider } = setup();

      await render(<SSOWebView flow={flow} tokenProvider={tokenProvider} />);
      await screen.findByTestId('webview');

      expect(launch).toHaveBeenCalledTimes(1);
      expect(launch).toHaveBeenCalledWith(token, undefined);
      expect(sourceOf()).toEqual({ uri: `${SSO_URL}t1` });
    });

    it('passes `path` to the flow', async () => {
      const { flow, launch, token, tokenProvider } = setup();

      await render(<SSOWebView flow={flow} tokenProvider={tokenProvider} path="/messages" />);
      await screen.findByTestId('webview');

      expect(launch).toHaveBeenCalledWith(token, '/messages');
    });

    it('defaults to the default Credential, refreshed first', async () => {
      const { flow, launch, token } = setup();
      const refreshIfNeeded = jest.fn().mockResolvedValue(undefined);
      (Credential.getDefault as jest.Mock).mockResolvedValue({ token, refreshIfNeeded });

      await render(<SSOWebView flow={flow} />);
      await screen.findByTestId('webview');

      expect(refreshIfNeeded).toHaveBeenCalledTimes(1);
      expect(refreshIfNeeded.mock.invocationCallOrder[0]).toBeLessThan(launch.mock.invocationCallOrder[0]);
      expect(launch).toHaveBeenCalledWith(token, undefined);
    });
  });

  describe('WebView props', () => {
    it('forwards WebView props, but not its own', async () => {
      const { flow, tokenProvider } = setup();
      const onLoadStart = jest.fn();
      const renderLoading = () => (<Text>Loading</Text>);
      const renderSSOError = () => (<Text>Error</Text>);

      await render(
        <SSOWebView
          flow={flow}
          tokenProvider={tokenProvider}
          path="/messages"
          renderLoading={renderLoading}
          renderSSOError={renderSSOError}
          javaScriptEnabled={false}
          onLoadStart={onLoadStart}
          style={{ flex: 1 }}
        />
      );
      const { props } = await screen.findByTestId('webview');

      expect(props).toMatchObject({ javaScriptEnabled: false, onLoadStart, style: { flex: 1 } });
      for (const own of ['flow', 'tokenProvider', 'path', 'renderLoading', 'renderSSOError']) {
        expect(props).not.toHaveProperty(own);
      }
    });

    it('starts the WebView in its loading state by default, unless overridden', async () => {
      const { flow, tokenProvider } = setup();

      const { unmount } = await render(<SSOWebView flow={flow} tokenProvider={tokenProvider} />);
      expect((await screen.findByTestId('webview')).props.startInLoadingState).toBe(true);
      await unmount();

      await render(<SSOWebView flow={flow} tokenProvider={tokenProvider} startInLoadingState={false} />);
      expect((await screen.findByTestId('webview')).props.startInLoadingState).toBe(false);
    });

    it('forwards `ref` to the WebView once it is rendered', async () => {
      const { flow, launch, tokenProvider } = setup();
      const exchange = deferred<URL>();
      launch.mockReturnValueOnce(exchange.promise);
      const ref = createRef<ComponentRef<typeof WebView>>();

      await render(<SSOWebView ref={ref} flow={flow} tokenProvider={tokenProvider} />);
      expect(ref.current).toBeNull();

      await act(async () => {
        exchange.resolve(new URL(`${SSO_URL}ref`));
      });
      await screen.findByTestId('webview');

      expect(typeof ref.current?.reload).toBe('function');
    });
  });

  describe('source lifecycle', () => {
    it('keeps the same `source` across unrelated re-renders', async () => {
      const { flow, launch, tokenProvider } = setup();
      const element = (flex: number) => <SSOWebView flow={flow} tokenProvider={tokenProvider} style={{ flex }} />;

      const { rerender } = await render(element(1));
      await screen.findByTestId('webview');
      const first = sourceOf();

      await rerender(element(2));

      expect(screen.getByTestId('webview').props.style).toEqual({ flex: 2 });
      expect(sourceOf()).toBe(first);
      expect(launch).toHaveBeenCalledTimes(1);
    });

    it('unmounts the WebView while a new token is exchanged, rather than swapping its `source`', async () => {
      const { flow, launch, tokenProvider } = setup();
      const exchange = deferred<URL>();
      launch.mockResolvedValueOnce(new URL(`${SSO_URL}a`)).mockReturnValueOnce(exchange.promise);
      const renderLoading = () => (<Text testID="loading">Loading</Text>);
      const element = (path: string) => (
        <SSOWebView flow={flow} tokenProvider={tokenProvider} path={path} renderLoading={renderLoading} />
      );

      const { rerender } = await render(element('/a'));
      await screen.findByTestId('webview');
      expect(sourceOf()).toEqual({ uri: `${SSO_URL}a` });

      await rerender(element('/b'));

      expect(screen.queryByTestId('webview')).toBeNull();
      expect(screen.getByTestId('loading')).toBeTruthy();

      await act(async () => {
        exchange.resolve(new URL(`${SSO_URL}b`));
      });
      await screen.findByTestId('webview');

      expect(sourceOf()).toEqual({ uri: `${SSO_URL}b` });
      expect(launch).toHaveBeenCalledTimes(2);
    });
  });

  describe('errors', () => {
    it('renders `renderSSOError` with the error and `retry`, and no WebView', async () => {
      const { flow, launch } = setup();
      const failure = new Error('no session');
      const tokenProvider = jest.fn().mockRejectedValue(failure);
      const calls: { error: Error; retry: () => void }[] = [];
      const renderSSOError = (error: Error, retry: () => void) => {
        calls.push({ error, retry });
        return <Text testID="error">{error.message}</Text>;
      };

      await render(<SSOWebView flow={flow} tokenProvider={tokenProvider} renderSSOError={renderSSOError} />);
      await screen.findByTestId('error');

      expect(calls.at(-1)?.error).toBe(failure);
      expect(typeof calls.at(-1)?.retry).toBe('function');
      expect(screen.queryByTestId('webview')).toBeNull();
      expect(launch).not.toHaveBeenCalled();
    });

    it('renders the error message by default', async () => {
      const { flow } = setup();
      const tokenProvider = jest.fn().mockRejectedValue(new Error('no session'));

      await render(<SSOWebView flow={flow} tokenProvider={tokenProvider} />);

      // the default view prefixes the message (ex: "Error: no session")
      expect(await screen.findByText(/no session/)).toBeTruthy();
    });

    it('surfaces a missing default Credential', async () => {
      const { flow, launch } = setup();
      (Credential.getDefault as jest.Mock).mockResolvedValue(null);

      await render(<SSOWebView flow={flow} />);

      expect(await screen.findByText(/No default Credential found/)).toBeTruthy();
      expect(launch).not.toHaveBeenCalled();
    });

    it('exchanges for a fresh token when `renderSSOError` calls `retry`', async () => {
      const { flow, launch, token } = setup();
      const tokenProvider = jest.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(token);
      const calls: { error: Error; retry: () => void }[] = [];
      const renderSSOError = (error: Error, retry: () => void) => {
        calls.push({ error, retry });
        return <Text testID="error">{error.message}</Text>;
      };

      await render(<SSOWebView flow={flow} tokenProvider={tokenProvider} renderSSOError={renderSSOError} />);
      await screen.findByTestId('error');

      await act(async () => {
        calls.at(-1)?.retry();
      });
      await screen.findByTestId('webview');

      expect(screen.queryByTestId('error')).toBeNull();
      expect(sourceOf()).toEqual({ uri: `${SSO_URL}t1` });
      expect(tokenProvider).toHaveBeenCalledTimes(2);
      expect(launch).toHaveBeenCalledTimes(1);
    });
  });
});
