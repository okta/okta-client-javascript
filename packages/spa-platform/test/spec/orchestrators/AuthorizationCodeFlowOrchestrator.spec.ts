import { Token, TokenOrchestratorError, OAuth2Error } from '@okta/auth-foundation';
import { Credential } from 'src/Credential';
import { AuthorizationCodeFlow } from 'src/flows/AuthorizationCodeFlow';
import { AuthorizationCodeFlowOrchestrator } from 'src/orchestrators/AuthorizationCodeFlowOrchestrator';
import { oauthClient, makeTestToken } from '../../helpers/makeTestResource';


describe('AuthorizationCodeFlowOrchestrator', () => {
  let flow;
  
  beforeEach(() => {
    Credential.clear();
    // @ts-expect-error - coordinator is a protected member
    Credential.coordinator.tokenStorage.encryptAtRest = false;

    jest.spyOn(oauthClient, 'openIdConfiguration').mockResolvedValue({
      issuer: oauthClient.configuration.baseURL.href,
      authorization_endpoint: `${oauthClient.configuration.baseURL.href}/authorize`
    });

    flow = new AuthorizationCodeFlow(oauthClient, {
      redirectUri: 'http://localhost:8080/login/callback'
    });
  });

  it('constructs', () => {
    const or1 = new AuthorizationCodeFlowOrchestrator(flow);
    expect(or1).toBeInstanceOf(AuthorizationCodeFlowOrchestrator);
    const or2 = new AuthorizationCodeFlowOrchestrator(flow, {
      emitBeforeRedirect: false
    });
    expect(or2).toBeInstanceOf(AuthorizationCodeFlowOrchestrator);
  });

  it('resumeFlow', async () => {
    const orch = new AuthorizationCodeFlowOrchestrator(flow);
    const resumeSpy = jest.spyOn(flow, 'resume').mockResolvedValue({
      token: makeTestToken(), context: { tags: ['foo', 'bar'] }
    });

    expect((await Credential.allIDs()).length).toBe(0);
    const result = await orch.resumeFlow();
    expect((await Credential.allIDs()).length).toBe(1);
    expect(result).toEqual({ tags: ['foo', 'bar'] });

    const error = new OAuth2Error({ error: 'Some OAuth Error' });
    resumeSpy.mockRejectedValue(error);
    await expect(orch.resumeFlow()).rejects.toThrow(error);
  });

  describe('getToken', () => {
    it('can find existing tokens from storage', async () => {
      const c1 = await Credential.store(makeTestToken());
      const c2 = await Credential.store(makeTestToken(), ['foo']);
      const c3 = await Credential.store(makeTestToken(null, {
        issuedAt: Date.now() - 500000
      }), ['expired']);

      // finds existing token from storage
      const orch1 = new AuthorizationCodeFlowOrchestrator(flow);
      expect(await orch1.getToken()).toEqual(c1.token);

      // finds existing token, filtering with tags
      const orch2 = new AuthorizationCodeFlowOrchestrator(flow, { tags: ['foo'] });
      expect(await orch2.getToken()).toEqual(c2.token);

      // will find an expired token and attempt to refresh it
      jest.spyOn(c3.oauth2, 'refresh').mockResolvedValue(c1.token);
      const orch3 = new AuthorizationCodeFlowOrchestrator(flow, { tags: ['expired'] });
      jest.spyOn((orch3 as any), 'requestToken').mockResolvedValue(c1.token);
      expect(await orch3.getToken()).toEqual(c1.token);

      // will find an expired token, but will request a new token when refresh fails
      jest.spyOn(c3.oauth2, 'refresh').mockRejectedValue(new Error('some oauth error'));
      const orch4 = new AuthorizationCodeFlowOrchestrator(flow, { tags: ['expired'] });
      jest.spyOn((orch4 as any), 'requestToken').mockResolvedValue(c2.token);
      expect(await orch4.getToken()).toEqual(c2.token);
    });

    it('will remove expired tokens from storage if refreshing fails', async () => {
      const c1 = await Credential.store(makeTestToken(null, {
        issuedAt: Date.now() - 500000
      }));
      jest.spyOn(c1, 'refreshIfNeeded').mockRejectedValue(new OAuth2Error('refresh failed'));
      jest.spyOn(c1, 'remove');
      const onError = jest.fn();

      const orch = new AuthorizationCodeFlowOrchestrator(flow);
      orch.on('error', onError);
      jest.spyOn((orch as any), 'requestToken').mockResolvedValue(c1.token);

      expect(Credential.size).toEqual(1);
      await orch.getToken();

      expect(c1.refreshIfNeeded).toHaveBeenCalledTimes(1);
      expect(c1.remove).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledTimes(1);
      expect(Credential.size).toEqual(0);
    });
  
    it('can request a token silently when no matching token exists', async () => {
      jest.spyOn(AuthorizationCodeFlow, 'PerformSilently').mockResolvedValue({ token:  makeTestToken(), context: {} });

      const orch = new AuthorizationCodeFlowOrchestrator(flow, { avoidPrompting: true });
      await expect(orch.getToken()).resolves.toBeInstanceOf(Token);
    });

    it('can request a token using redirect when no matching token exists', async () => {
      jest.spyOn(AuthorizationCodeFlow, 'PerformRedirect').mockResolvedValue(undefined);

      expect(flow.inProgress).toBe(false);
      const orch = new AuthorizationCodeFlowOrchestrator(flow, { emitBeforeRedirect: false });
      await expect(orch.getToken()).rejects.toThrow(new TokenOrchestratorError('Fatal error, failed to perform redirect'));
      expect(flow.inProgress).toBe(true);
      expect(flow.context.scopes).toBe(undefined);

      flow.reset();

      expect(flow.inProgress).toBe(false);
      await expect(orch.getToken({ scopes: ['foo', 'bar'] }))
        .rejects.toThrow(new TokenOrchestratorError('Fatal error, failed to perform redirect'));
      expect(flow.inProgress).toBe(true);
      expect(flow.context).toMatchObject({ scopes: ['foo', 'bar'] });
    });

    it('will block execution after `login_required` event is fired', async () => {
      jest.spyOn(AuthorizationCodeFlow, 'PerformRedirect').mockResolvedValue(undefined);
      const startSpy = jest.spyOn(flow, 'start');

      let done;
      const orch = new AuthorizationCodeFlowOrchestrator(flow, { emitBeforeRedirect: true });
      orch.on('login_prompt_required', (event) => {
        done = event.done;
      });

      expect(flow.inProgress).toBe(false);
      expect(done).toBe(undefined);   // assert `done` is undefined (not set yet)
      const promise = orch.getToken();

      // Promise.race used to assert `.getToken` is still pending
      const step1 = await Promise.race([
        promise,
        new Promise((resolve) => { setTimeout(resolve, 100); })
      ]);
      expect(step1).toBe(undefined);   // assert still pending
      expect(typeof done).toBe('function'); // assert `done` was set (via event handler)

      done({ foo: 1 });   // call done to continue the promise chain

      // Promise.race used to assert `.getToken` resolved
      const step2 = Promise.race([
        promise,
        new Promise((resolve) => { setTimeout(resolve, 100); })
      ]);
      // `getToken` throws in the "default case" which is unreachable in normal applications
      await expect(step2).rejects.toThrow(TokenOrchestratorError);    // assert promise fulfilled

      expect(flow.inProgress).toBe(true);
      expect(startSpy).toHaveBeenCalledTimes(1);
      expect(startSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({
          originalUri: expect.any(String),
          foo: 1      // asserts metadata is passed to flow.start via `done(meta)`
        }),
        expect.anything()   // don't care about the context value in this test
      );
    });

    describe('per-call `originalUri` and `stateData`', () => {
      const redirectError = new TokenOrchestratorError('Fatal error, failed to perform redirect');
      let startSpy: jest.SpyInstance;

      beforeEach(() => {
        jest.spyOn(AuthorizationCodeFlow, 'PerformRedirect').mockResolvedValue(undefined);
        startSpy = jest.spyOn(flow, 'start');
      });

      it('uses the current location as `originalUri` by default', async () => {
        const orch = new AuthorizationCodeFlowOrchestrator(flow, { emitBeforeRedirect: false });
        await expect(orch.getToken()).rejects.toThrow(redirectError);
        expect(startSpy).toHaveBeenLastCalledWith({ originalUri: '/' }, expect.anything());
      });

      it('passes `originalUri` to the flow', async () => {
        const orch = new AuthorizationCodeFlowOrchestrator(flow, { emitBeforeRedirect: false });
        await expect(orch.getToken({ originalUri: '/user/profile?tab=1#top' })).rejects.toThrow(redirectError);
        expect(startSpy).toHaveBeenLastCalledWith({ originalUri: '/user/profile?tab=1#top' }, expect.anything());
      });

      it('merges `stateData`, keeping the default `originalUri`', async () => {
        const orch = new AuthorizationCodeFlowOrchestrator(flow, { emitBeforeRedirect: false });
        await expect(orch.getToken({ stateData: { foo: 1 } })).rejects.toThrow(redirectError);
        expect(startSpy).toHaveBeenLastCalledWith({ originalUri: '/', foo: 1 }, expect.anything());
      });

      it('does not mutate the provided `stateData`', async () => {
        const stateData = { foo: 1 };
        const orch = new AuthorizationCodeFlowOrchestrator(flow, { emitBeforeRedirect: false });
        await expect(orch.getToken({ originalUri: '/a', stateData })).rejects.toThrow(redirectError);
        expect(stateData).toEqual({ foo: 1 });
      });

      it('applies precedence: default < `stateData` < `originalUri` < `done(meta)`', async () => {
        const orch = new AuthorizationCodeFlowOrchestrator(flow, { emitBeforeRedirect: false });

        await expect(orch.getToken({ stateData: { originalUri: '/from-state' } })).rejects.toThrow(redirectError);
        expect(startSpy).toHaveBeenLastCalledWith({ originalUri: '/from-state' }, expect.anything());
        flow.reset();

        await expect(orch.getToken({ originalUri: '/shorthand', stateData: { originalUri: '/from-state' } }))
          .rejects.toThrow(redirectError);
        expect(startSpy).toHaveBeenLastCalledWith({ originalUri: '/shorthand' }, expect.anything());
        flow.reset();

        const promptOrch = new AuthorizationCodeFlowOrchestrator(flow, { emitBeforeRedirect: true });
        promptOrch.on('login_prompt_required', ({ done }) => {
          (done as any)({ originalUri: '/from-done' });
        });
        await expect(promptOrch.getToken({ originalUri: '/shorthand' })).rejects.toThrow(redirectError);
        expect(startSpy).toHaveBeenLastCalledWith({ originalUri: '/from-done' }, expect.anything());
      });

      it('does not carry values over to later calls', async () => {
        const orch = new AuthorizationCodeFlowOrchestrator(flow, { emitBeforeRedirect: false });
        await expect(orch.getToken({ originalUri: '/first', stateData: { foo: 1 } })).rejects.toThrow(redirectError);
        flow.reset();

        await expect(orch.getToken()).rejects.toThrow(redirectError);
        expect(startSpy).toHaveBeenLastCalledWith({ originalUri: '/' }, expect.anything());
      });

      it('provides `originalUri` and `stateData` to `login_prompt_required` listeners', async () => {
        const orch = new AuthorizationCodeFlowOrchestrator(flow, { emitBeforeRedirect: true });
        const listener = jest.fn(({ done }) => done());
        orch.on('login_prompt_required', listener);

        const params = { scopes: ['foo'], originalUri: '/a', stateData: { foo: 1 } };
        await expect(orch.getToken(params)).rejects.toThrow(redirectError);
        expect(listener).toHaveBeenCalledWith(expect.objectContaining({ params }));
        // only the OAuth2 params make it into the flow context, state data goes to the flow as meta
        expect(startSpy).toHaveBeenLastCalledWith({ originalUri: '/a', foo: 1 }, { scopes: ['foo'] });
      });

      it('does not use them when a valid token is found in storage', async () => {
        const cred = await Credential.store(makeTestToken());
        jest.spyOn(cred, 'refreshIfNeeded').mockResolvedValue(undefined);

        const orch = new AuthorizationCodeFlowOrchestrator(flow, { emitBeforeRedirect: false });
        jest.spyOn(orch, 'selectCredential').mockResolvedValue(cred);
        await expect(orch.getToken({ originalUri: '/a', stateData: { foo: 1 } })).resolves.toBe(cred.token);
        expect(startSpy).not.toHaveBeenCalled();
      });

      it('ignores them when `avoidPrompting` is enabled', async () => {
        jest.spyOn(AuthorizationCodeFlow, 'PerformSilently').mockResolvedValue({ token: makeTestToken(), context: {} });

        const orch = new AuthorizationCodeFlowOrchestrator(flow, { avoidPrompting: true });
        await expect(orch.getToken({ originalUri: '/a', stateData: { foo: 1 } })).resolves.toBeInstanceOf(Token);
        expect(startSpy).toHaveBeenLastCalledWith({}, expect.anything());
      });
    });

    describe('`getOriginalUri` option', () => {
      const redirectError = new TokenOrchestratorError('Fatal error, failed to perform redirect');
      let startSpy: jest.SpyInstance;

      beforeEach(() => {
        jest.spyOn(AuthorizationCodeFlow, 'PerformRedirect').mockResolvedValue(undefined);
        startSpy = jest.spyOn(flow, 'start');
      });

      it('defaults to the current location', async () => {
        const orch = new AuthorizationCodeFlowOrchestrator(flow, { emitBeforeRedirect: false });
        expect(orch.options.getOriginalUri()).toBe('/');
        await expect(orch.getToken()).rejects.toThrow(redirectError);
        expect(startSpy).toHaveBeenLastCalledWith({ originalUri: '/' }, expect.anything());
      });

      it('provides the default `originalUri` when none is provided to `getToken`', async () => {
        const getOriginalUri = jest.fn(() => '/custom/default');
        const orch = new AuthorizationCodeFlowOrchestrator(flow, { emitBeforeRedirect: false, getOriginalUri });
        await expect(orch.getToken()).rejects.toThrow(redirectError);
        expect(getOriginalUri).toHaveBeenCalledTimes(1);
        expect(startSpy).toHaveBeenLastCalledWith({ originalUri: '/custom/default' }, expect.anything());
      });

      it('is still used when `stateData` is provided without an `originalUri`', async () => {
        const orch = new AuthorizationCodeFlowOrchestrator(flow, {
          emitBeforeRedirect: false,
          getOriginalUri: () => '/custom/default'
        });
        await expect(orch.getToken({ stateData: { foo: 1 } })).rejects.toThrow(redirectError);
        expect(startSpy).toHaveBeenLastCalledWith({ originalUri: '/custom/default', foo: 1 }, expect.anything());
      });

      it('is not called when `originalUri` is provided to `getToken`', async () => {
        const getOriginalUri = jest.fn(() => '/custom/default');
        const orch = new AuthorizationCodeFlowOrchestrator(flow, { emitBeforeRedirect: false, getOriginalUri });
        await expect(orch.getToken({ originalUri: '/per-call' })).rejects.toThrow(redirectError);
        expect(getOriginalUri).not.toHaveBeenCalled();
        expect(startSpy).toHaveBeenLastCalledWith({ originalUri: '/per-call' }, expect.anything());
      });

      it('is not called when `stateData.originalUri` is provided to `getToken`', async () => {
        const getOriginalUri = jest.fn(() => '/custom/default');
        const orch = new AuthorizationCodeFlowOrchestrator(flow, { emitBeforeRedirect: false, getOriginalUri });
        await expect(orch.getToken({ stateData: { originalUri: '/from-state' } })).rejects.toThrow(redirectError);
        expect(getOriginalUri).not.toHaveBeenCalled();
        expect(startSpy).toHaveBeenLastCalledWith({ originalUri: '/from-state' }, expect.anything());
      });

      it('is overridden by the object provided to `done()` of `login_prompt_required`', async () => {
        const orch = new AuthorizationCodeFlowOrchestrator(flow, {
          emitBeforeRedirect: true,
          getOriginalUri: () => '/custom/default'
        });
        orch.on('login_prompt_required', ({ done }) => {
          (done as any)({ originalUri: '/from-done' });
        });
        await expect(orch.getToken()).rejects.toThrow(redirectError);
        expect(startSpy).toHaveBeenLastCalledWith({ originalUri: '/from-done' }, expect.anything());
      });

      it('is evaluated each time a redirect starts, not when the orchestrator is constructed', async () => {
        let current = '/first';
        const getOriginalUri = jest.fn(() => current);
        const orch = new AuthorizationCodeFlowOrchestrator(flow, { emitBeforeRedirect: false, getOriginalUri });
        expect(getOriginalUri).not.toHaveBeenCalled();

        await expect(orch.getToken()).rejects.toThrow(redirectError);
        expect(startSpy).toHaveBeenLastCalledWith({ originalUri: '/first' }, expect.anything());
        flow.reset();

        current = '/second';
        await expect(orch.getToken()).rejects.toThrow(redirectError);
        expect(startSpy).toHaveBeenLastCalledWith({ originalUri: '/second' }, expect.anything());
        expect(getOriginalUri).toHaveBeenCalledTimes(2);
      });

      it('is not called when a valid token is found in storage', async () => {
        const getOriginalUri = jest.fn(() => '/custom/default');
        const cred = await Credential.store(makeTestToken());
        jest.spyOn(cred, 'refreshIfNeeded').mockResolvedValue(undefined);

        const orch = new AuthorizationCodeFlowOrchestrator(flow, { emitBeforeRedirect: false, getOriginalUri });
        jest.spyOn(orch, 'selectCredential').mockResolvedValue(cred);
        await expect(orch.getToken()).resolves.toBe(cred.token);
        expect(getOriginalUri).not.toHaveBeenCalled();
      });

      it('is not called when `avoidPrompting` is enabled', async () => {
        jest.spyOn(AuthorizationCodeFlow, 'PerformSilently').mockResolvedValue({ token: makeTestToken(), context: {} });

        const getOriginalUri = jest.fn(() => '/custom/default');
        const orch = new AuthorizationCodeFlowOrchestrator(flow, { avoidPrompting: true, getOriginalUri });
        await expect(orch.getToken()).resolves.toBeInstanceOf(Token);
        expect(getOriginalUri).not.toHaveBeenCalled();
      });
    });

    it('throws when flow is already in progress', async () => {
      const orch = new AuthorizationCodeFlowOrchestrator(flow);
      await flow.start();
      await expect(orch.getToken()).rejects.toThrow(new TokenOrchestratorError('flow already in progress'));
    });

    // NOTE: remove this test when multi-AS support is added
    it('throws when oauth params do not match configuration', async () => {
      const orch = new AuthorizationCodeFlowOrchestrator(flow);
      await expect(orch.getToken({clientId: 'foobar'})).rejects.toThrow(TokenOrchestratorError);
      await expect(orch.getToken({issuer: 'http://localhost:3000'})).rejects.toThrow(TokenOrchestratorError);
    });
  });

  it('invalidateToken', async () => {
    const cred = await Credential.store(makeTestToken());
    const orch = new AuthorizationCodeFlowOrchestrator(flow);
    const requestTokenSpy = jest.spyOn((orch as any), 'requestToken').mockResolvedValue(null);

    expect(await orch.getToken()).toEqual(cred.token);
    expect(requestTokenSpy).toHaveBeenCalledTimes(0);

    await orch.invalidateToken('foo');      // has no effect, invalid id
    expect(await orch.getToken()).toEqual(cred.token);
    expect(requestTokenSpy).toHaveBeenCalledTimes(0);

    await orch.invalidateToken(cred.id);    // subsequent `.getToken()` call will invoke `requestToken()`
    expect(await orch.getToken()).toEqual(null);
    expect(requestTokenSpy).toHaveBeenCalledTimes(1);
  });
});