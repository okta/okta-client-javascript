import { OAuth2Error } from '@okta/auth-foundation';
import OAuth2Client from '@okta/auth-foundation/client';
import { SessionLogoutFlow } from 'src/SessionLogoutFlow';


describe('SessionLogoutFlow', () => {
  const authParams = {
    baseURL: 'https://fake.okta.com',
    clientId: 'fake',
    scopes: 'openid email profile',
  };
  const flowParams = {
    issuer: authParams.baseURL,
    logoutRedirectUri: 'http://localhost:8080/logout'
  };
  const params = {...authParams, ...flowParams};


  it('constructs', () => {
    const flow1 = new SessionLogoutFlow(params);
    expect(flow1).toBeInstanceOf(SessionLogoutFlow);

    const client = new OAuth2Client(authParams);
    const flow2 = new SessionLogoutFlow(client, flowParams);
    expect(flow2).toBeInstanceOf(SessionLogoutFlow);
  });

  describe('methods', () => {
    let client;
    beforeEach(() => {
      client = new OAuth2Client(authParams);

      jest.spyOn(client, 'openIdConfiguration').mockResolvedValue({
        end_session_endpoint: `${authParams.baseURL}/logout`
      });
    });

    describe('start', () => {
      const idToken = 'mock_id_token_string';

      it('builds authorize url with params', async () => {
        const flow = new SessionLogoutFlow(client, flowParams);
        const flowStartSpy = jest.fn();
        flow.on('flow_started', flowStartSpy);

        const expectations = (logoutUrl) => {
          expect(flowStartSpy).toHaveBeenCalledTimes(1);
          expect(logoutUrl.searchParams.get('id_token_hint')).toEqual(idToken);
          expect(typeof logoutUrl.searchParams.get('state')).toBe('string');
          expect(logoutUrl.searchParams.get('state')).not.toBe('');
          expect(logoutUrl.searchParams.get('post_logout_redirect_uri')).toEqual(flowParams.logoutRedirectUri);
        };

        expect(flow.inProgress).toBe(false);
        const url1 = await flow.start(idToken);
        expectations(url1);

        flow.reset();
        flowStartSpy.mockReset();

        expect(flow.inProgress).toBe(false);
        const url2 = await flow.start({ state: 'somestatevalue', idToken });
        expectations(url2);
      });

      it('throws on invalid openId config', async () => {
        jest.spyOn(client, 'openIdConfiguration').mockResolvedValue({});

        const flow = new SessionLogoutFlow(client, flowParams);
        const flowStartSpy = jest.fn();
        flow.on('flow_started', flowStartSpy);
        const flowStopSpy = jest.fn();
        flow.on('flow_stopped', flowStopSpy);
        const flowErrorSpy = jest.fn();
        flow.on('flow_errored', flowErrorSpy);

        const expectedError = new OAuth2Error(
          'Missing `end_session_endpoint` from ./well-known config'
        );
        await expect(flow.start(idToken)).rejects.toThrow(expectedError);

        expect(flow.inProgress).toEqual(false);
        expect(flowStartSpy).toHaveBeenCalledTimes(1);
        expect(flowStopSpy).toHaveBeenCalledTimes(1);
        expect(flowErrorSpy).toHaveBeenCalledTimes(1);
        expect(flowErrorSpy).toHaveBeenLastCalledWith({error: expectedError});
      });
    });
  });
});
