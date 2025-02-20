import { Token, OAuth2Error } from '@okta/auth-foundation';
import { AuthorizationCodeFlow } from '@okta/spa-oauth2-flows';
import { Credential } from 'src/Credential';
import { AuthorizationCodeFlowOrchestrator, TokenOrchestratorError } from 'src/TokenOrchestrator';
import { oauthClient, makeTestToken } from '../helpers/makeTestResource';


describe('AuthorizationCodeFlowOrchestrator', () => {
  let flow;
  
  beforeEach(() => {
    Credential.clear();

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

    expect(Credential.allIDs.length).toBe(0);
    const result = await orch.resumeFlow();
    expect(Credential.allIDs.length).toBe(1);
    expect(result).toEqual({ tags: ['foo', 'bar'] });

    const error = new OAuth2Error({ error: 'Some OAuth Error' });
    resumeSpy.mockRejectedValue(error);
    await expect(orch.resumeFlow()).rejects.toThrow(error);
  });

  describe('getToken', () => {
    it('can find existing tokens from storage', async () => {
      const c1 = Credential.store(makeTestToken());
      const c2 = Credential.store(makeTestToken(), ['foo']);
      Credential.store(makeTestToken(null, {
        issuedAt: Date.now() - 500000
      }), ['expired']);

      // finds existing token from storage
      const orch1 = new AuthorizationCodeFlowOrchestrator(flow);
      expect(await orch1.getToken()).toEqual(c1.token);

      // finds existing token, filtering with tags
      const orch2 = new AuthorizationCodeFlowOrchestrator(flow, { tags: ['foo'] });
      expect(await orch2.getToken()).toEqual(c2.token);

      // will find an expired token, therefore will request a fresh token
      const orch3 = new AuthorizationCodeFlowOrchestrator(flow, { tags: ['expired'] });
      jest.spyOn((orch3 as any), 'requestToken').mockResolvedValue(c1.token);
      expect(await orch3.getToken()).toEqual(c1.token);
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
});