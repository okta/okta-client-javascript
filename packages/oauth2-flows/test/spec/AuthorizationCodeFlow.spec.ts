import { OAuth2Error } from '@okta/auth-foundation';
import OAuth2Client from '@okta/auth-foundation/client';
import { AuthenticationFlowError } from 'src/AuthenticationFlow';
import { AuthorizationCodeFlow } from 'src/AuthorizationCodeFlow';
import { AuthTransaction } from 'src/AuthTransaction';

describe('AuthorizationCodeFlow', () => {
  const authParams = {
    baseURL: 'https://fake.okta.com',
    clientId: 'fake',
    scopes: 'openid email profile',
  };
  const flowParams = {
    issuer: authParams.baseURL,
    redirectUri: 'http://localhost:8080/callback'
  };
  const params = {...authParams, ...flowParams};

  it('constructs', () => {
    const flow1 = new AuthorizationCodeFlow(params);
    expect(flow1).toBeInstanceOf(AuthorizationCodeFlow);

    const client = new OAuth2Client(authParams);
    const flow2 = new AuthorizationCodeFlow(client, flowParams);
    expect(flow2).toBeInstanceOf(AuthorizationCodeFlow);
  });

  describe('methods', () => {
    let client;
    beforeEach(() => {
      client = new OAuth2Client(authParams);

      jest.spyOn(client, 'openIdConfiguration').mockResolvedValue({
        authorization_endpoint: `${authParams.baseURL}/authorize`
      });
    });

    describe('start', () => {
      it('builds authorize url with params', async () => {
        const flow = new AuthorizationCodeFlow(client, flowParams);
        const flowStartSpy = jest.fn();
        flow.on('flow_started', flowStartSpy);

        const startPromise = flow.start();
        
        expect(flow.inProgress).toEqual(true);
        expect(flowStartSpy).toHaveBeenCalledTimes(1);

        const authorizeUrl = await startPromise;

        expect(authorizeUrl.searchParams.get('client_id')).toEqual(authParams.clientId);
        expect(typeof authorizeUrl.searchParams.get('state')).toBe('string');
        expect(authorizeUrl.searchParams.get('state')).not.toBe('');
        expect(authorizeUrl.searchParams.get('redirect_uri')).toEqual(flowParams.redirectUri);
        expect(authorizeUrl.searchParams.get('response_type')).toEqual('code');
        expect(typeof authorizeUrl.searchParams.get('nonce')).toBe('string');
        expect(authorizeUrl.searchParams.get('nonce')).not.toBe('');
        expect(typeof authorizeUrl.searchParams.get('code_challenge')).toBe('string');
        expect(authorizeUrl.searchParams.get('code_challenge')).not.toBe('');
        expect(authorizeUrl.searchParams.get('code_challenge_method')).toEqual('S256');
      });

      it('throws on invalid openId config', async () => {
        jest.spyOn(client, 'openIdConfiguration').mockResolvedValue({});

        const flow = new AuthorizationCodeFlow(client, flowParams);
        const flowStartSpy = jest.fn();
        flow.on('flow_started', flowStartSpy);
        const flowStopSpy = jest.fn();
        flow.on('flow_stopped', flowStopSpy);
        const flowErrorSpy = jest.fn();
        flow.on('flow_errored', flowErrorSpy);

        const expectedError = new OAuth2Error(
          'Missing `authorization_endpoint` from ./well-known config'
        );
        await expect(flow.start()).rejects.toThrow(expectedError);

        expect(flow.inProgress).toEqual(false);
        expect(flowStartSpy).toHaveBeenCalledTimes(1);
        expect(flowStopSpy).toHaveBeenCalledTimes(1);
        expect(flowErrorSpy).toHaveBeenCalledTimes(1);
        expect(flowErrorSpy).toHaveBeenLastCalledWith({error: expectedError});
      });

      it('does not store PKCE after consumption', async () => {
        const flow = new AuthorizationCodeFlow(client, flowParams);
        expect((flow as any).context).toEqual(null);
        await flow.start();
        expect((flow as any).context).not.toEqual(null);
        expect((flow as any).context.pkce).toEqual(undefined);
      });
    });

    describe('resume', () => {
      let flow;
      const spies: any = {};

      const state = 'somestatevalue';
      const code = 'somecodevalue';
      const context = { state, pkce: 'pkcecodechallenge', foo: 'bar' };

      beforeEach(() => {
        flow = new AuthorizationCodeFlow(client, flowParams);

        spies.start = jest.fn();
        flow.on('flow_started', spies.start);
        spies.stop = jest.fn();
        flow.on('flow_stopped', spies.stop);
        spies.error = jest.fn();
        flow.on('flow_errored', spies.error);

        spies.removeTransaction = jest.spyOn(AuthTransaction, 'remove');
        spies.exchange = jest.spyOn(flow as any, 'exchangeCodeForTokens').mockResolvedValue({});

        jest.spyOn(AuthTransaction, 'load').mockResolvedValue(context);
      });

      it('can process an auth code redirect', async () => {
        const redirectUri = new URL(flowParams.redirectUri);
        redirectUri.searchParams.set('code', code);
        redirectUri.searchParams.set('state', state);

        expect(flow.inProgress).toEqual(false);
        await flow.resume(redirectUri.href);
        // cannot assert .inProgress true, jest executes too fast
        // events are triggered when .inProgress is set, so if they fire
        // the value was toggled during execution

        expect(flow.inProgress).toEqual(false);
        expect(spies.start).toHaveBeenCalledTimes(1);
        expect(spies.stop).toHaveBeenCalledTimes(1);
        expect(spies.exchange).toHaveBeenCalledTimes(1);
        expect(spies.exchange).toHaveBeenLastCalledWith(code, context);
        expect(spies.removeTransaction).toHaveBeenCalledTimes(1);
        expect(spies.removeTransaction).toHaveBeenLastCalledWith(state);
      });

      it('parses oauth error returned in redirect url', async () => {
        const oauthError = {
          error: 'someoautherror',
          errorDescription: 'someoautherrordesc',
          errorUri: 'someoautherroruri',
        };
        const expectedError = new OAuth2Error('someoautherror');

        const redirectUri = new URL(flowParams.redirectUri);
        redirectUri.searchParams.set('error', oauthError.error);
        redirectUri.searchParams.set('error_description', oauthError.errorDescription);
        redirectUri.searchParams.set('error_uri', oauthError.errorUri);

        expect(flow.inProgress).toEqual(false);
        await expect(flow.resume(redirectUri.href)).rejects.toThrow(expectedError);

        expect(flow.inProgress).toEqual(false);
        expect(spies.start).toHaveBeenCalledTimes(1);
        expect(spies.stop).toHaveBeenCalledTimes(1);
        expect(spies.error).toHaveBeenCalledTimes(1);
        expect(spies.error).toHaveBeenLastCalledWith({ error: expectedError });
        expect(spies.exchange).not.toHaveBeenCalled();
        expect(spies.removeTransaction).not.toHaveBeenCalled();
      });

      it('cannot parse redirect url', async () => {
        const expectedError1 = new AuthenticationFlowError('Failed to parse `code` from redirect url');
        const expectedError2 = new AuthenticationFlowError('Failed to parse `state` from redirect url');

        const redirectUri = new URL(flowParams.redirectUri);

        expect(flow.inProgress).toEqual(false);
        await expect(flow.resume(redirectUri.href)).rejects.toThrow(expectedError1);

        expect(flow.inProgress).toEqual(false);
        expect(spies.start).toHaveBeenCalledTimes(1);
        expect(spies.stop).toHaveBeenCalledTimes(1);
        expect(spies.error).toHaveBeenCalledTimes(1);
        expect(spies.error).toHaveBeenLastCalledWith({ error: expectedError1 });
        expect(spies.exchange).not.toHaveBeenCalled();
        expect(spies.removeTransaction).not.toHaveBeenCalled();

        redirectUri.searchParams.set('code', code);
        await expect(flow.resume(redirectUri.href)).rejects.toThrow(expectedError2);
        expect(flow.inProgress).toEqual(false);
        expect(spies.start).toHaveBeenCalledTimes(2);
        expect(spies.stop).toHaveBeenCalledTimes(2);
        expect(spies.error).toHaveBeenCalledTimes(2);
        expect(spies.error).toHaveBeenLastCalledWith({ error: expectedError2 });
        expect(spies.exchange).not.toHaveBeenCalled();
        expect(spies.removeTransaction).not.toHaveBeenCalled();
      });

      it('cannot load stored auth transaction', async () => {
        const expectedError = new AuthenticationFlowError(`Failed to load auth transaction for state ${state}`);

        jest.spyOn(AuthTransaction, 'load').mockResolvedValue(null);

        const redirectUri = new URL(flowParams.redirectUri);
        redirectUri.searchParams.set('code', code);
        redirectUri.searchParams.set('state', state);

        expect(flow.inProgress).toEqual(false);
        await expect(flow.resume(redirectUri.href)).rejects.toThrow(expectedError);

        expect(flow.inProgress).toEqual(false);
        expect(spies.start).toHaveBeenCalledTimes(1);
        expect(spies.stop).toHaveBeenCalledTimes(1);
        expect(spies.error).toHaveBeenCalledTimes(1);
        expect(spies.error).toHaveBeenLastCalledWith({ error: expectedError });
        expect(spies.exchange).not.toHaveBeenCalled();
        expect(spies.removeTransaction).toHaveBeenCalledTimes(1);
        expect(spies.removeTransaction).toHaveBeenLastCalledWith(state);
      });

      it('cannot exchange code for tokens', async () => {
        const oauthError = new OAuth2Error('some_oauth_error');
        spies.exchange.mockRejectedValue(oauthError);
        expect(oauthError.context).toEqual({});

        const redirectUri = new URL(flowParams.redirectUri);
        redirectUri.searchParams.set('code', code);
        redirectUri.searchParams.set('state', state);

        await expect(flow.resume(redirectUri.href)).rejects.toThrow(oauthError);

        expect(flow.inProgress).toEqual(false);
        expect(flow.context).toEqual(null);   // flow.context will be cleared in `finally` block (via this.reset())
        expect(oauthError.context).toEqual(context);    // error will be updated to contain flow context
        expect(spies.start).toHaveBeenCalledTimes(1);
        expect(spies.stop).toHaveBeenCalledTimes(1);
        expect(spies.error).toHaveBeenCalledTimes(1);
        expect(spies.error).toHaveBeenLastCalledWith({ error: oauthError });
        expect(spies.exchange).toHaveBeenCalledTimes(1);
        expect(spies.exchange).toHaveBeenLastCalledWith(code, context);
        expect(spies.removeTransaction).toHaveBeenCalledTimes(1);
        expect(spies.removeTransaction).toHaveBeenLastCalledWith(state);
      });
    });
  });

  describe('statics', () => {
    // TODO:
  });
});
