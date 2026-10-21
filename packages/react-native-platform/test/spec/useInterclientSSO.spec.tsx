import { createElement, useEffect } from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { createRoot } from 'test-renderer';
import type { Token } from '@okta/auth-foundation/core';
import { useInterclientSSO } from 'src/flows/InterclientAccessFlow/useInterclientSSO';
import type { InterclientAccessFlow } from 'src/flows/InterclientAccessFlow/InterclientAccessFlow';

// Every test supplies its own `tokenProvider`, so the default (Credential-backed) one is never reached
jest.mock('src/core', () => ({
  Credential: { getDefault: jest.fn() },
  CredentialError: class CredentialError extends Error {}
}));

// `renderHook` from `@testing-library/react-native` doesn't expose `isStrictMode`, and wrapping the hook in `<StrictMode>`
// ran its effects only once (cause not investigated). So specs which depend on StrictMode's dev-only effect → cleanup → effect
// re-run render on a strict `test-renderer` root directly.
const openStrictRoots: Array<() => Promise<void>> = [];

afterEach(async () => {
  await Promise.all(openStrictRoots.splice(0).map(unmount => unmount()));
});

async function renderStrictHook<Result, Props = undefined> (hook: (props: Props) => Result, initialProps?: Props) {
  const result = {} as { current: Result };
  const Probe = ({ hookProps }: { hookProps: Props }) => {
    const value = hook(hookProps);
    useEffect(() => {
      result.current = value;
    });
    return null;
  };

  const root = createRoot({ isStrictMode: true });
  const rerender = (hookProps: Props) => act(() => {
    root.render(createElement(Probe, { hookProps }));
  });

  let unmounted = false;
  const unmount = async () => {
    if (!unmounted) {
      unmounted = true;
      await act(() => {
        root.unmount();
      });
    }
  };
  openStrictRoots.push(unmount);

  await rerender(initialProps as Props);
  return { result, rerender, unmount };
}

// A stand-in for `InterclientAccessFlow` whose `launch` mints a distinct "token" per call, so tests can
// tell exchanges apart (and count how many tokens were minted)
function setup () {
  let minted = 0;
  const token = {} as Token;
  const launch = jest.fn(async () => new URL(`https://app.example.com/native/sso#token=t${++minted}`));
  const tokenProvider = jest.fn(async () => token);

  return { flow: { launch } as unknown as InterclientAccessFlow, launch, token, tokenProvider };
}

describe('useInterclientSSO', () => {
  it('exchanges once and exposes the URL as a `source`', async () => {
    const { flow, launch, token, tokenProvider } = setup();
    const { result } = await renderHook(() => useInterclientSSO(flow, { tokenProvider, path: '/messages' }));

    await waitFor(() => expect(result.current.status).toBe('ready'));

    expect(launch).toHaveBeenCalledTimes(1);
    expect(launch).toHaveBeenCalledWith(token, '/messages');
    expect(result.current.source).toEqual({ uri: 'https://app.example.com/native/sso#token=t1' });
  });

  it('mints only one token under StrictMode', async () => {
    const { flow, launch, tokenProvider } = setup();
    let effectMounts = 0;
    const { result } = await renderStrictHook(() => {
      useEffect(() => {
        effectMounts++;
      }, []);
      return useInterclientSSO(flow, { tokenProvider });
    });

    await waitFor(() => expect(result.current.status).toBe('ready'));

    // guards against a vacuous pass: proves StrictMode really ran the effects twice
    expect(effectMounts).toBe(2);
    expect(launch).toHaveBeenCalledTimes(1);
    expect(tokenProvider).toHaveBeenCalledTimes(1);
    expect(result.current.source).toEqual({ uri: 'https://app.example.com/native/sso#token=t1' });
  });

  it('keeps `source` referentially stable across re-renders', async () => {
    const { flow, launch, tokenProvider } = setup();
    const { result, rerender } = await renderStrictHook(
      ({ unrelated }: { unrelated: number }) => ({ unrelated, ...useInterclientSSO(flow, { tokenProvider }) }),
      { unrelated: 0 }
    );

    await waitFor(() => expect(result.current.status).toBe('ready'));
    const first = result.current.source;

    await rerender({ unrelated: 1 });

    expect(result.current.unrelated).toBe(1);
    expect(result.current.source).toBe(first);
    expect(launch).toHaveBeenCalledTimes(1);
  });

  it('clears `source` and mints a fresh token on `retry`', async () => {
    const { flow, launch, tokenProvider } = setup();
    const statuses: string[] = [];
    const { result } = await renderStrictHook(() => {
      const hook = useInterclientSSO(flow, { tokenProvider });
      statuses.push(hook.status);
      return hook;
    });

    await waitFor(() => expect(result.current.status).toBe('ready'));
    const first = result.current.source;
    statuses.length = 0;

    await act(async () => {
      result.current.retry();
    });
    await waitFor(() => expect(result.current.source?.uri).toBe('https://app.example.com/native/sso#token=t2'));

    // `source` is cleared between the two, so a `WebView` rendered from it re-mounts
    expect(statuses.indexOf('loading')).toBeGreaterThan(-1);
    expect(statuses.indexOf('loading')).toBeLessThan(statuses.lastIndexOf('ready'));
    expect(result.current.source).not.toBe(first);
    expect(launch).toHaveBeenCalledTimes(2);
    expect(tokenProvider).toHaveBeenCalledTimes(2);
  });

  it('mints a new token when `path` changes', async () => {
    const { flow, launch, token, tokenProvider } = setup();
    const { result, rerender } = await renderStrictHook(
      ({ path }: { path: string }) => useInterclientSSO(flow, { tokenProvider, path }),
      { path: '/a' }
    );

    await waitFor(() => expect(result.current.status).toBe('ready'));
    await rerender({ path: '/b' });
    await waitFor(() => expect(result.current.source?.uri).toBe('https://app.example.com/native/sso#token=t2'));

    expect(launch).toHaveBeenCalledTimes(2);
    expect(launch).toHaveBeenLastCalledWith(token, '/b');
  });

  it('mints a fresh token when the host component re-mounts', async () => {
    const { flow, launch, tokenProvider } = setup();

    const first = await renderStrictHook(() => useInterclientSSO(flow, { tokenProvider }));
    await waitFor(() => expect(first.result.current.status).toBe('ready'));
    await first.unmount();

    const second = await renderStrictHook(() => useInterclientSSO(flow, { tokenProvider }));
    await waitFor(() => expect(second.result.current.status).toBe('ready'));

    expect(launch).toHaveBeenCalledTimes(2);
    expect(second.result.current.source).toEqual({ uri: 'https://app.example.com/native/sso#token=t2' });
  });

  describe('errors', () => {
    it('surfaces a `tokenProvider` failure without attempting an exchange', async () => {
      const { flow, launch } = setup();
      const failure = new Error('no session');
      const tokenProvider = jest.fn(async () => { throw failure; });

      const { result } = await renderStrictHook(() => useInterclientSSO(flow, { tokenProvider }));
      await waitFor(() => expect(result.current.status).toBe('error'));

      expect(result.current).toMatchObject({ error: failure, source: null });
      expect(launch).not.toHaveBeenCalled();
    });

    it('wraps non-`Error` rejections in an `Error`', async () => {
      const { flow } = setup();
      const tokenProvider = jest.fn(() => Promise.reject('boom'));

      const { result } = await renderHook(() => useInterclientSSO(flow, { tokenProvider }));
      await waitFor(() => expect(result.current.status).toBe('error'));

      expect(result.current).toMatchObject({ status: 'error', error: expect.any(Error) });
      expect((result.current as { error: Error }).error.message).toBe('boom');
    });

    it('recovers via `retry`', async () => {
      const { flow, launch, token } = setup();
      const tokenProvider = jest.fn()
        .mockRejectedValueOnce(new Error('offline'))
        .mockResolvedValue(token);

      const { result } = await renderHook(() => useInterclientSSO(flow, { tokenProvider }));
      await waitFor(() => expect(result.current.status).toBe('error'));

      await act(async () => {
        result.current.retry();
      });
      await waitFor(() => expect(result.current.status).toBe('ready'));

      expect(launch).toHaveBeenCalledTimes(1);
      expect(result.current.source).toEqual({ uri: 'https://app.example.com/native/sso#token=t1' });
    });
  });
});
