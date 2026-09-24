import { Token, OAuth2Client, OAuth2Error } from '@okta/auth-foundation';
import { ResourceOwnerFlow } from 'src/ResourceOwnerFlow';


describe('ResourceOwnerFlow', () => {
  const authParams = {
    baseURL: 'https://fake.okta.com',
    clientId: 'fake',
    scopes: 'openid email profile',
  };
  const params = { ...authParams, issuer: authParams.baseURL };

  const username = 'someusername';
  const password = 'somepassword';

  it('constructs', () => {
    const flow1 = new ResourceOwnerFlow(params);
    expect(flow1).toBeInstanceOf(ResourceOwnerFlow);

    const client = new OAuth2Client(authParams);
    const flow2 = new ResourceOwnerFlow(client);
    expect(flow2).toBeInstanceOf(ResourceOwnerFlow);
  });

  describe('methods', () => {
    let client;
    beforeEach(() => {
      client = new OAuth2Client(authParams);

      jest.spyOn(client, 'openIdConfiguration').mockResolvedValue({
        token_endpoint: `${authParams.baseURL}/token`
      });
    });

    describe('start', () => {
      it('exchanges username/password for tokens', async () => {
        const flow = new ResourceOwnerFlow(client);
        const flowStartSpy = jest.fn();
        flow.on('flow_started', flowStartSpy);
        const flowStopSpy = jest.fn();
        flow.on('flow_stopped', flowStopSpy);

        const expectedToken = { accessToken: 'fake_access_token' } as Token;
        const exchangeSpy = jest.spyOn(flow.client, 'exchange').mockResolvedValue(expectedToken);

        const startPromise = flow.start(username, password);

        expect(flow.inProgress).toEqual(true);
        expect(flowStartSpy).toHaveBeenCalledTimes(1);

        const token = await startPromise;

        expect(token).toEqual(expectedToken);
        expect(exchangeSpy).toHaveBeenCalledTimes(1);
        expect(flow.inProgress).toEqual(false);
        expect(flowStopSpy).toHaveBeenCalledTimes(1);
      });

      it('resets flow state after a successful exchange', async () => {
        const flow = new ResourceOwnerFlow(client);
        jest.spyOn(flow.client, 'exchange').mockResolvedValue({ accessToken: 'fake' } as Token);

        await flow.start(username, password);

        expect(flow.inProgress).toEqual(false);
      });

      it('throws on invalid openId config', async () => {
        jest.spyOn(client, 'openIdConfiguration').mockResolvedValue({});

        const flow = new ResourceOwnerFlow(client);
        const flowStartSpy = jest.fn();
        flow.on('flow_started', flowStartSpy);
        const flowStopSpy = jest.fn();
        flow.on('flow_stopped', flowStopSpy);
        const flowErrorSpy = jest.fn();
        flow.on('flow_errored', flowErrorSpy);

        const expectedError = new OAuth2Error('missing `token_endpoint`');
        await expect(flow.start(username, password)).rejects.toThrow(expectedError);

        expect(flow.inProgress).toEqual(false);
        expect(flowStartSpy).toHaveBeenCalledTimes(1);
        expect(flowStopSpy).toHaveBeenCalledTimes(1);
        expect(flowErrorSpy).toHaveBeenCalledTimes(1);
        expect(flowErrorSpy).toHaveBeenLastCalledWith({ error: expectedError });
      });

      it('throws when the server rejects the credentials', async () => {
        const flow = new ResourceOwnerFlow(client);
        const flowErrorSpy = jest.fn();
        flow.on('flow_errored', flowErrorSpy);

        const oauthErrorResponse = { error: 'invalid_grant', errorDescription: 'The credentials are invalid' };
        jest.spyOn(client, 'exchange').mockResolvedValue(oauthErrorResponse);

        const expectedError = new OAuth2Error(oauthErrorResponse);
        await expect(flow.start(username, password)).rejects.toThrow(expectedError);

        expect(flow.inProgress).toEqual(false);
        expect(flowErrorSpy).toHaveBeenCalledTimes(1);
        expect(flowErrorSpy).toHaveBeenLastCalledWith({ error: expectedError });
      });
    });

    describe('TokenRequest', () => {
      it('builds a `password` grant request body', async () => {
        const flow = new ResourceOwnerFlow(client, { additionalParameters: { foo: 'bar' } });

        const exchangeSpy = jest.spyOn(client, 'exchange').mockResolvedValue({ accessToken: 'fake' });

        await flow.start(username, password, { baz: 'qux' });

        expect(exchangeSpy).toHaveBeenCalledTimes(1);
        const request = exchangeSpy.mock.calls[0][0];

        expect(request).toBeInstanceOf(ResourceOwnerFlow.TokenRequest);
        expect(request.body.get('grant_type')).toEqual('password');
        expect(request.body.get('client_id')).toEqual(authParams.clientId);
        expect(request.body.get('username')).toEqual(username);
        expect(request.body.get('password')).toEqual(password);
        expect(request.body.get('scope')).toEqual(authParams.scopes);
        expect(request.body.get('foo')).toEqual('bar');
        expect(request.body.get('baz')).toEqual('qux');
      });
    });
  });
});
