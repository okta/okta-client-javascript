import { AuthenticationFlowError } from '@okta/oauth2-flows';
import { AuthorizationCodeFlow, InterclientAccessExchangeFlow } from 'src/flows';
import { oauthClient } from '../../helpers/makeTestResource';


const params = {
  redirectUri: 'http://localhost:8080/native/sso'
};

const { parseNativeHandoff, PerformNativeHandoff } = InterclientAccessExchangeFlow;

// jsdom can't spy on `location.assign` (see AuthorizationCodeFlow.spec.ts), so the redirect is mocked at `PerformRedirect`
function setup () {
  const flow = new InterclientAccessExchangeFlow(oauthClient, params);
  const start = jest.spyOn(flow, 'start').mockResolvedValue(new URL('http://localhost:8080/oauth2/authorize'));
  const performRedirect = jest.spyOn(AuthorizationCodeFlow, 'PerformRedirect').mockResolvedValue(undefined);
  return { flow, start, performRedirect };
}

const setLocation = (path: string) => window.history.replaceState(null, '', path);

describe('InterclientAccessExchangeFlow', () => {
  afterEach(() => {
    setLocation('/');
  });

  it('constructs', () => {
    const flow = new InterclientAccessExchangeFlow(oauthClient, params);
    expect(flow).toBeInstanceOf(InterclientAccessExchangeFlow);
    expect(flow).toBeInstanceOf(AuthorizationCodeFlow);
  });

  describe('parseNativeHandoff', () => {
    it('reads the token from the hash and the path from the query', () => {
      expect(parseNativeHandoff('http://localhost:8080/native/sso?path=%2Fmessages#token=abc'))
        .toEqual({ interclientToken: 'abc', path: '/messages' });
    });

    it('falls back to the token in the query', () => {
      expect(parseNativeHandoff('http://localhost:8080/native/sso?token=abc&path=%2Fmessages'))
        .toEqual({ interclientToken: 'abc', path: '/messages' });
    });

    it('prefers the hash over the query', () => {
      expect(parseNativeHandoff('http://localhost:8080/native/sso?token=query#token=hash')?.interclientToken).toBe('hash');
    });

    it('accepts a URL instance', () => {
      expect(parseNativeHandoff(new URL('http://localhost:8080/native/sso#token=abc')))
        .toEqual({ interclientToken: 'abc', path: undefined });
    });

    it('reads the path from the url it was given, not `window.location`', () => {
      setLocation('/native/sso?path=%2Fcurrent#token=current');
      expect(parseNativeHandoff('http://localhost:8080/native/sso?path=%2Fother#token=other'))
        .toEqual({ interclientToken: 'other', path: '/other' });
    });

    it('defaults to `window.location`', () => {
      setLocation('/native/sso?path=%2Fa#token=abc');
      expect(parseNativeHandoff()).toEqual({ interclientToken: 'abc', path: '/a' });
    });

    it('returns `null` when there is no token', () => {
      expect(parseNativeHandoff('http://localhost:8080/native/sso?path=%2Fa')).toBeNull();
      expect(parseNativeHandoff('http://localhost:8080/native/sso')).toBeNull();
      expect(parseNativeHandoff('http://localhost:8080/native/sso#token=')).toBeNull();
    });

    it.each(['code', 'state', 'error'])('returns `null` for an authorization response (`%s`), even with a token', (param) => {
      expect(parseNativeHandoff(`http://localhost:8080/native/sso?${param}=x#token=abc`)).toBeNull();
    });

    it('keeps a root-relative path with its own query and fragment', () => {
      const url = `http://localhost:8080/native/sso?path=${encodeURIComponent('/messages?id=1#top')}#token=abc`;
      expect(parseNativeHandoff(url)?.path).toBe('/messages?id=1#top');
    });
  });

  describe('PerformNativeHandoff', () => {
    it('starts the flow with the interclient token and path, then redirects', async () => {
      const { flow, start, performRedirect } = setup();

      await PerformNativeHandoff(flow, { interclientToken: 'abc', path: '/messages' });

      expect(start).toHaveBeenCalledTimes(1);
      expect(start).toHaveBeenCalledWith({ path: '/messages' }, {}, { interclient_token: 'abc' });
      expect(performRedirect).toHaveBeenCalledWith(flow);
      expect(start.mock.invocationCallOrder[0]).toBeLessThan(performRedirect.mock.invocationCallOrder[0]);
    });

    it('parses `window.location` when no params are given', async () => {
      setLocation('/native/sso?path=%2Fa#token=abc');
      const { flow, start, performRedirect } = setup();

      await PerformNativeHandoff(flow);

      expect(start).toHaveBeenCalledWith({ path: '/a' }, {}, { interclient_token: 'abc' });
      expect(performRedirect).toHaveBeenCalledTimes(1);
    });

    it('rejects when no params are given and the current url is not a handoff', async () => {
      setLocation('/native/sso?code=c&state=s');
      const { flow, start, performRedirect } = setup();

      await expect(PerformNativeHandoff(flow)).rejects.toMatchObject({
        code: 'MISSING_INTERCLIENT_TOKEN'
      });
      await expect(PerformNativeHandoff(flow)).rejects.toBeInstanceOf(AuthenticationFlowError);
      expect(start).not.toHaveBeenCalled();
      expect(performRedirect).not.toHaveBeenCalled();
    });

    it('continues a flow which was already started, without starting another', async () => {
      const { flow, start, performRedirect } = setup();
      jest.spyOn(flow, 'inProgress', 'get').mockReturnValue(true);

      await PerformNativeHandoff(flow);

      expect(start).not.toHaveBeenCalled();
      expect(performRedirect).toHaveBeenCalledWith(flow);
    });

    describe('address bar', () => {
      it('removes the token from the hash, keeping the rest of the url', async () => {
        setLocation('/native/sso?path=%2Fa#token=abc&keep=1');
        const { flow } = setup();

        await PerformNativeHandoff(flow);

        expect(window.location.pathname).toBe('/native/sso');
        expect(window.location.search).toBe('?path=%2Fa');
        expect(window.location.hash).toBe('#keep=1');
      });

      it('removes the token from the query', async () => {
        setLocation('/native/sso?token=abc&path=%2Fa');
        const { flow } = setup();

        await PerformNativeHandoff(flow);

        expect(window.location.search).toBe('?path=%2Fa');
        expect(window.location.href).not.toContain('abc');
      });

      it('removes the token when the caller parsed it from the current url', async () => {
        setLocation('/native/sso#token=abc');
        const { flow } = setup();

        await PerformNativeHandoff(flow, parseNativeHandoff()!);

        expect(window.location.href).not.toContain('abc');
      });

      it('leaves the url alone for a token which did not come from it', async () => {
        setLocation('/native/sso#token=current');
        const { flow } = setup();

        await PerformNativeHandoff(flow, { interclientToken: 'other' });

        expect(window.location.hash).toBe('#token=current');
      });

      it('leaves the url intact when the flow fails to start, so a reload can retry', async () => {
        setLocation('/native/sso#token=abc');
        const { flow, start, performRedirect } = setup();
        start.mockRejectedValueOnce(new Error('network'));

        await expect(PerformNativeHandoff(flow)).rejects.toThrow('network');

        expect(window.location.hash).toBe('#token=abc');
        expect(performRedirect).not.toHaveBeenCalled();
      });
    });
  });
});
