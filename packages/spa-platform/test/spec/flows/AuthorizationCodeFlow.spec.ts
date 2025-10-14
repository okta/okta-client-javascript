jest.mock('@okta/auth-foundation', () => {
  const actual = jest.requireActual('@okta/auth-foundation');
  return {
    ...actual,
    PKCE: {
      generate: () => Promise.resolve({
        challenge: 'fakechallenge',
        method: 'SHA256',
        verifier: 'fakeverifier'
      })
    },
    randomBytes: () => 'randomstring'
  };
});

import { OAuth2Error } from '@okta/auth-foundation';
import { Token } from 'src/platform';
import { AuthorizationCodeFlow as Base, AuthenticationFlowError } from '@okta/oauth2-flows';
import { AuthorizationCodeFlow } from 'src/flows';
import { oauthClient, makeTestToken } from '../../helpers/makeTestResource';


const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const params = {
  redirectUri: 'http://localhost:8080/login/callback'
};

describe('AuthorizationCodeFlow', () => {
  let testContext: any = {};

  beforeEach(() => {
    jest.spyOn(oauthClient, 'openIdConfiguration').mockResolvedValue({
      issuer: 'http://localhost:8080/',
      authorization_endpoint: 'http://localhost:8080/oauth2/authorize',
      token_endpoint: 'http://localhost:8080/oauth2/token'
    });

    jest.spyOn(window, 'postMessage').mockImplementation((data) => {
      const msg = new MessageEvent('message', {
        data,
        origin: 'http://localhost:8080',
        source: window,
      });

      window.dispatchEvent(msg);
    });
  });

  it('constructs', async () => {
    const flow = new AuthorizationCodeFlow(oauthClient, params);
    expect(flow).toBeInstanceOf(AuthorizationCodeFlow);
    expect(flow).toBeInstanceOf(Base);
  });


  describe.skip('PerformRedirect', () => {
    // NOTE: https://github.com/jsdom/jsdom/issues/3739
    // jsdom has made all read-only properties within browsers (like window.location) truly read-only
    // this breaks essentially all techniques for mocking/spying on Location methods (like `location.assign`)
    // without being made to spy on `location.assign`, it may not be possible to write tests for this method
    //
    // Attempts which didn't work:
    // - https://www.benmvp.com/blog/mocking-window-location-methods-jest-jsdom/
    // - https://stackoverflow.com/questions/54090231/how-to-fix-error-not-implemented-navigation-except-hash-changes
    // - https://dev.to/tmhao2005/tip-mock-jsdom-location-with-jest-2kbp
    // - https://www.joshmcarthur.com/til/2022/01/19/assert-windowlocation-properties-with-jest.html

    beforeEach(() => {
      const flow = new AuthorizationCodeFlow(oauthClient, params);
      flow.start = jest.fn().mockResolvedValue(new URL('http://localhost:8080/authorize'));
      testContext = { flow };
    });

    it('performs a redirect to /authorize', async () => {
      const { flow } = testContext;

      const promise = AuthorizationCodeFlow.PerformRedirect(flow);
      await sleep(100);
      expect(promise).toBeInstanceOf(Promise);
      console.log(window.location);
      expect(window.location.assign).toHaveBeenCalled();

    });
  });

  describe('PerformSilently', () => {
    beforeEach(() => {
      jest.useRealTimers();

      const flow = new AuthorizationCodeFlow(oauthClient, params);
      jest.spyOn(flow, 'start');
      jest.spyOn(flow, 'reset');
      jest.spyOn(global, 'clearTimeout');

      testContext = { flow };
    });

    afterEach(() => {
      // verify the flow was started and reset
      const { flow } = testContext;
      expect(flow.start).toHaveBeenCalledTimes(1);
      expect(flow.reset).toHaveBeenCalledTimes(1);

      // verify the iframe was removed from the DOM
      const { length } = document.getElementsByTagName('iframe');
      expect(length).toBe(0);

      // verify the timeout is cleared
      // (if a test calls `jest.useFakeTimers()`, then expect(spy) check fails
      // therefore only assert if `clearTimeout` is a mock
      if (jest.isMockFunction(clearTimeout)) {
        expect(clearTimeout).toHaveBeenCalledTimes(1);
      }
      else {
        jest.useRealTimers();
      }
    });

    it('should return tokens', async () => {
      const { flow } = testContext;

      const token = makeTestToken();
      const exchangeSpy = jest.spyOn(flow.client, 'exchange').mockResolvedValue(token);
      const promise = AuthorizationCodeFlow.PerformSilently(flow);
      await sleep(10);    // short sleep is required so listener has time to set before event fires

      window.postMessage({
        state: 'randomstring',
        code: 'fakecode'
      });

      const result = await promise;
      expect(result.token).toBeInstanceOf(Token);
      expect(Token.isEqual(token, result.token)).toBe(true);
      expect(result.context).toEqual({});
      expect(exchangeSpy).toHaveBeenCalledTimes(1);
      expect((exchangeSpy.mock?.lastCall?.[0] as any)?.code).toEqual('fakecode');
    });

    it('can accept a flow instance which is actively started', async () => {
      const { flow } = testContext;

      const token = makeTestToken();
      const exchangeSpy = jest.spyOn(flow.client, 'exchange').mockResolvedValue(token);

      await flow.start();  // manually triggers `.start()`
      const promise = AuthorizationCodeFlow.PerformSilently(flow);
      await sleep(10);    // short sleep is required so listener has time to set before event fires

      window.postMessage({
        state: 'randomstring',
        code: 'fakecode'
      });

      const result = await promise;
      expect(result.token).toBeInstanceOf(Token);
      expect(Token.isEqual(token, result.token)).toBe(true);
      expect(result.context).toEqual({});
      expect(exchangeSpy).toHaveBeenCalledTimes(1);
      expect((exchangeSpy.mock?.lastCall?.[0] as any)?.code).toEqual('fakecode');
    });

    it('should propagate oauth errors from post message', async () => {
      const { flow } = testContext;

      const token = makeTestToken();
      jest.spyOn(flow.client, 'exchange').mockResolvedValue(token);

      const promise = AuthorizationCodeFlow.PerformSilently(flow);
      await sleep(10);    // short sleep is required so listener has time to set before event fires

      window.postMessage({
        state: 'randomstring',
        error: 'some oauth error'
      });

      await expect(promise).rejects.toThrow(new OAuth2Error('some oauth error'));
    });

    it('should ignore message with wrong state value and timeout', async () => {
      jest.useFakeTimers();

      const { flow } = testContext;

      const token = makeTestToken();
      jest.spyOn(flow.client, 'exchange').mockResolvedValue(token);

      const onMessageSpy = jest.fn();

      let errorCaught = false;
      try {
        const promise = AuthorizationCodeFlow.PerformSilently(flow);
        // binds redundant message listener to (loosely) confirm message was received
        // (this method would timeout whether or not a message was received)
        window.addEventListener('message', onMessageSpy);
        await jest.advanceTimersByTimeAsync(10);
  
        window.postMessage({
          state: 'badstatevalue',
          code: 'fakecode'
        });
  
        jest.runAllTimers();    // triggers timeout
        await promise;
      }
      catch (err) {
        errorCaught = true;
        expect(err).toEqual(new AuthenticationFlowError('Authentication flow timed out'));
      }

      // confirm the catch block above was reached
      expect(errorCaught).toBe(true);
      // confirms the message was received
      expect(onMessageSpy).toHaveBeenCalled();
    });
  });

  describe('PerformInPopup', () => {
    const basePopupMock: any = {
      location: { assign: jest.fn() },
      closed: false,
      opener: window,
      close: jest.fn()
    };

    beforeEach(() => {
      jest.useRealTimers();

      jest.spyOn(global, 'clearTimeout');
      jest.spyOn(global, 'clearInterval');

      const flow = new AuthorizationCodeFlow(oauthClient, params);
      jest.spyOn(flow, 'start');
      jest.spyOn(flow, 'reset');

      const popupMock = { ...basePopupMock };
      const openSpy = jest.spyOn(window, 'open').mockReturnValue(popupMock);

      testContext = { flow, popupMock, openSpy };
    });

    afterEach(() => {
      const { flow, popupMock, openSpy } = testContext;
      expect(flow.start).toHaveBeenCalledTimes(1);
      expect(flow.reset).toHaveBeenCalledTimes(1);


      const popupWasOpened = openSpy.mock.calls.length > 0 && openSpy.mock.results[0]?.value !== null;
      if (popupWasOpened) {
        expect(popupMock.close).toHaveBeenCalledTimes(1);

        // verify the timeout is cleared
        // (if a test calls `jest.useFakeTimers()`, then expect(spy) check fails
        // therefore only assert if `clearTimeout` is a mock
        if (jest.isMockFunction(clearTimeout)) {
          // timeout from postMessage listener
          expect(clearTimeout).toHaveBeenCalledTimes(1);
          // interval from popup closed poll
          expect(clearInterval).toHaveBeenCalledTimes(1);
        }
        else {
          jest.useRealTimers();
        }
      }
    });

    it('should return tokens', async () => {
      const { flow, popupMock } = testContext;

      const testToken = makeTestToken();
      const exchangeSpy = jest.spyOn(flow.client, 'exchange').mockResolvedValue(testToken);

      const promise = AuthorizationCodeFlow.PerformInPopup(flow);
      await sleep(10);    // short sleep is required so listener has time to set before event fires

      window.postMessage({
        state: 'randomstring',
        code: 'fakecode'
      });

      // @ts-expect-error `token`/`context` and `reason` are never returned at the same (per return type)
      const { token, context, completed, reason } = await promise;
      expect(token).toBeInstanceOf(Token);
      expect(Token.isEqual(testToken, token)).toBe(true);
      expect(context).toEqual({});
      expect(completed).toBe(true);
      expect(reason).toBeUndefined();

      expect(exchangeSpy).toHaveBeenCalledTimes(1);
      expect((exchangeSpy.mock?.lastCall?.[0] as any)?.code).toEqual('fakecode');
      expect(popupMock.location.assign).toHaveBeenCalledTimes(1);
    });

    it('can accept a flow instance which is actively started', async () => {
      const { flow, popupMock } = testContext;

      const testToken = makeTestToken();
      const exchangeSpy = jest.spyOn(flow.client, 'exchange').mockResolvedValue(testToken);

      await flow.start();  // manually triggers `.start()`
      const promise = AuthorizationCodeFlow.PerformInPopup(flow);
      await sleep(10);    // short sleep is required so listener has time to set before event fires

      window.postMessage({
        state: 'randomstring',
        code: 'fakecode'
      });

      // @ts-expect-error `token`/`context` and `reason` are never returned at the same (per return type)
      const { token, context, completed, reason } = await promise;
      expect(token).toBeInstanceOf(Token);
      expect(Token.isEqual(testToken, token)).toBe(true);
      expect(context).toEqual({});
      expect(completed).toBe(true);
      expect(reason).toBeUndefined();

      expect(exchangeSpy).toHaveBeenCalledTimes(1);
      expect((exchangeSpy.mock?.lastCall?.[0] as any)?.code).toEqual('fakecode');
      expect(popupMock.location.assign).toHaveBeenCalledTimes(1);
    });

    it('should propagate oauth errors from post message', async () => {
      const { flow } = testContext;

      const startSpy = jest.spyOn(flow, 'start');
      const testToken = makeTestToken();
      const exchangeSpy = jest.spyOn(flow.client, 'exchange').mockResolvedValue(testToken);

      const promise = AuthorizationCodeFlow.PerformInPopup(flow);
      await sleep(10);    // short sleep is required so listener has time to set before event fires

      window.postMessage({
        state: 'randomstring',
        error: 'some oauth error'
      });
  
      await expect(promise).rejects.toThrow(new OAuth2Error('some oauth error'));
      expect(startSpy).toHaveBeenCalledTimes(1);
      expect(exchangeSpy).not.toHaveBeenCalled();
    });

    it('should ignore message with wrong state value and timeout', async () => {
      jest.useFakeTimers();

      const { flow } = testContext;

      const testToken = makeTestToken();
      jest.spyOn(flow.client, 'exchange').mockResolvedValue(testToken);

      const onMessageSpy = jest.fn();

      let errorCaught = false;
      try {
        const promise = AuthorizationCodeFlow.PerformInPopup(flow);
        // binds redundant message listener to (loosely) confirm message was received
        // (this method would timeout whether or not a message was received)
        window.addEventListener('message', onMessageSpy);
        await jest.advanceTimersByTimeAsync(10);
  
        window.postMessage({
          state: 'badstatevalue',
          code: 'fakecode'
        });

        jest.runOnlyPendingTimers();    // triggers timeout
        await promise;
      }
      catch (err) {
        errorCaught = true;
        expect(err).toEqual(new AuthenticationFlowError('Authentication flow timed out'));
      }

      // confirm the catch block above was reached
      expect(errorCaught).toBe(true);
      // confirms the message was received
      expect(onMessageSpy).toHaveBeenCalled();
    });

    it('should return if popup is blocked', async () => {
      const { flow } = testContext;

      jest.spyOn(window, 'open').mockReturnValue(null);

      await flow.start();
      const promise = AuthorizationCodeFlow.PerformInPopup(flow);

      // @ts-expect-error `token`/`context` and `reason` are never returned at the same (per return type)
      const { token, context, completed, reason } = await promise;
      expect(completed).toBe(false);
      expect(reason).toBe('blocked');
      expect(token).toBeUndefined();
      expect(context).toBeUndefined();
    });

    it('should throw if the main `window` object is passed', async () => {
      const { flow } = testContext;

      jest.spyOn(window, 'open').mockReturnValue(null);

      await flow.start();
      const promise = AuthorizationCodeFlow.PerformInPopup(flow, window);

      await expect(promise).rejects.toThrow(new AuthenticationFlowError('window reference provided is not a popup'));
    });

    it('should gracefully handle a user closing the popup window', async () => {
      jest.useFakeTimers();

      const { flow, popupMock } = testContext;

      // @ts-ignore
      // jest.spyOn(global, 'setTimeout').mockImplementation(() => {});

      const promise = AuthorizationCodeFlow.PerformInPopup(flow);

      popupMock.closed = true;
      await jest.advanceTimersByTimeAsync(150);

      // @ts-expect-error `token`/`context` and `reason` are never returned at the same (per return type)
      const { token, context, completed, reason } = await promise;
      expect(completed).toBe(false);
      expect(reason).toBe('closed');
      expect(token).toBeUndefined();
      expect(context).toBeUndefined();
    });
  });
});
