import { FetchClient } from 'src/FetchClient';
import { TokenOrchestrator } from 'src/TokenOrchestrator';
import { APIClientError } from 'src/errors';
import { randStr } from '@repo/jest-helpers/browser/helpers';
import { makeTestToken } from '../helpers/makeTestResource';


class MockOrchestrator extends TokenOrchestrator {
  public getToken() {
    return Promise.resolve(null);
  }
}

describe('FetchClient', () => {
  let context: any = {};

  beforeEach(() => {
    const fetchSpy = global.fetch = jest.fn();
    const mockOrchestrator = new MockOrchestrator();
    const client = new FetchClient(mockOrchestrator);

    context = { client, mockOrchestrator, fetchSpy };

    (client as any).dpopNonceCache.clear();
  });

  it('can make an authenticated resource request', async () => {
    const { client, mockOrchestrator, fetchSpy } = context;
    const token = makeTestToken();
    jest.spyOn(mockOrchestrator, 'getToken').mockResolvedValue(token);

    fetchSpy.mockImplementation(() => Response.json({ foo: 'bar' }));

    const response1 = await client.fetch('http://localhost:8080/foo');

    expect(response1).toBeInstanceOf(Response);
    expect(response1.status).toEqual(200);
    expect(await response1.json()).toEqual({ foo: 'bar' });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.lastCall[0].headers.get('authorization')).toEqual(`Bearer ${token.accessToken}`);
    expect(fetchSpy.mock.lastCall[0].headers.get('dpop')).toBe(null);

    const request = new Request('http://localhost:8080/foo');
    const response2 = await client.fetch(request);

    expect(response2).toBeInstanceOf(Response);
    expect(response2.status).toEqual(200);
    expect(await response2.json()).toEqual({ foo: 'bar' });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy.mock.lastCall[0].headers.get('authorization')).toEqual(`Bearer ${token.accessToken}`);
    expect(fetchSpy.mock.lastCall[0].headers.get('dpop')).toBe(null);

    // test with a (mocked) dpop-bound token
    const dpopToken = makeTestToken(null, { tokenType: 'DPoP' });
    dpopToken.dpopSigningAuthority.sign = jest.fn().mockImplementation(async (request) => {
      request.headers.set('dpop', 'fakedpopvalue');
      return request;
    });
    jest.spyOn(mockOrchestrator, 'getToken').mockResolvedValue(dpopToken);

    const response3 = await client.fetch('http://localhost:8080/foo');

    expect(response3).toBeInstanceOf(Response);
    expect(response3.status).toEqual(200);
    expect(await response3.json()).toEqual({ foo: 'bar' });
    expect(fetchSpy).toHaveBeenCalledTimes(3);
    expect(fetchSpy.mock.lastCall[0].headers.get('authorization')).toEqual(`DPoP ${dpopToken.accessToken}`);
    expect(fetchSpy.mock.lastCall[0].headers.get('dpop')).toEqual('fakedpopvalue');
  });

  it('will use custom fetch implementation', async () => {
    const { mockOrchestrator, fetchSpy } = context;
    const token = makeTestToken();
    jest.spyOn(mockOrchestrator, 'getToken').mockResolvedValue(token);
    fetchSpy.mockResolvedValue(Response.json({ foo: 'bar' }));

    const fetchImpl = jest.fn().mockImplementation(() => Response.json({ bar: 'foo' }));
    const client = new FetchClient(mockOrchestrator, { fetchImpl });

    const response = await client.fetch('http://localhost:8080/foo');

    expect(response).toBeInstanceOf(Response);
    expect(response.status).toEqual(200);
    expect(await response.json()).toEqual({ bar: 'foo' });
    expect(fetchImpl).toHaveBeenCalled();
    expect(fetchImpl.mock.lastCall[0].headers.get('authorization')).toEqual(`Bearer ${token.accessToken}`);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('will pass params to upstream methods when provided', async () => {
    const { client, mockOrchestrator, fetchSpy } = context;
    const getTokenSpy = jest.spyOn(mockOrchestrator, 'getToken').mockResolvedValue(makeTestToken());

    fetchSpy.mockImplementation(() => Response.json({ foo: 'bar' }));

    const response = await client.fetch('http://localhost:8080/foo', {
      clientId: 'foo',
      scopes: ['a', 'b', 'c'],
      method: 'POST',
      redirect: 'manual'
    });

    expect(response).toBeInstanceOf(Response);
    expect(response.status).toEqual(200);
    expect(await response.json()).toEqual({ foo: 'bar' });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const lastFetchReq = fetchSpy.mock?.lastCall?.[0];
    expect(lastFetchReq).toBeInstanceOf(Request);
    expect(lastFetchReq.url).toBe('http://localhost:8080/foo');
    expect(lastFetchReq.method).toBe('POST');
    expect(lastFetchReq.redirect).toBe('manual');

    expect(getTokenSpy).toHaveBeenCalledTimes(1);
    expect(getTokenSpy).toHaveBeenLastCalledWith(expect.objectContaining({
      clientId: 'foo',
      scopes: ['a', 'b', 'c']
    }));
  });

  it('will throw if token cannot be obtained', async () => {
    const { client, mockOrchestrator, fetchSpy } = context;
    const orchestratorSpy = jest.spyOn(mockOrchestrator, 'getToken').mockResolvedValue(null);

    fetchSpy.mockImplementation(() => Response.json({ foo: 'bar' }));

    await expect(client.fetch('http://localhost:8080/foo')).rejects.toThrow(new Error('Unable to acquire token to sign request'));

    expect(orchestratorSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('will throw if fetch fails', async () => {
    const { client, mockOrchestrator, fetchSpy } = context;
    const orchestratorSpy = jest.spyOn(mockOrchestrator, 'getToken').mockResolvedValue(makeTestToken());

    fetchSpy.mockRejectedValue(new Error('foo'));

    await expect(client.fetch('http://localhost:8080/foo')).rejects.toThrow(new Error('foo'));

    expect(orchestratorSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('will skip signing request when `authorizeRequest = false`', async () => {
    const { client, mockOrchestrator, fetchSpy } = context;
    const getTokenSpy = jest.spyOn(mockOrchestrator, 'getToken').mockResolvedValue(makeTestToken());

    fetchSpy.mockImplementation(() => Response.json({ foo: 'bar' }));

    const response = await client.fetch('http://localhost:8080/foo', {
      clientId: 'foo',
      scopes: ['a', 'b', 'c'],
      method: 'POST',
      redirect: 'manual',
      authorizeRequest: false
    });

    expect(response).toBeInstanceOf(Response);
    expect(response.status).toEqual(200);
    expect(await response.json()).toEqual({ foo: 'bar' });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const lastFetchReq = fetchSpy.mock?.lastCall?.[0];
    expect(lastFetchReq).toBeInstanceOf(Request);
    expect(lastFetchReq.url).toBe('http://localhost:8080/foo');
    expect(lastFetchReq.method).toBe('POST');
    expect(lastFetchReq.redirect).toBe('manual');

    expect(getTokenSpy).not.toHaveBeenCalled();
  });

  it('will use client default fetch options when updated', async () => {
    const { client, mockOrchestrator, fetchSpy } = context;
    const getTokenSpy = jest.spyOn(mockOrchestrator, 'getToken').mockResolvedValue(makeTestToken());

    fetchSpy.mockImplementation(() => Response.json({ foo: 'bar' }));

    client.defaultRequestOptions.authorizeRequest = () => false;
    const response1 = await client.fetch('http://localhost:8080/foo', {
      clientId: 'foo',
      scopes: ['a', 'b', 'c'],
      method: 'POST',
      redirect: 'manual'
    });

    expect(response1).toBeInstanceOf(Response);
    expect(response1.status).toEqual(200);
    expect(await response1.json()).toEqual({ foo: 'bar' });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(getTokenSpy).toHaveBeenCalledTimes(0);

    getTokenSpy.mockClear();
    fetchSpy.mockClear();

    client.defaultRequestOptions.authorizeRequest = () => true;
    const response2 = await client.fetch('http://localhost:8080/foo', {
      clientId: 'foo',
      scopes: ['a', 'b', 'c'],
      method: 'POST',
      redirect: 'manual'
    });

    expect(response2).toBeInstanceOf(Response);
    expect(response2.status).toEqual(200);
    expect(await response2.json()).toEqual({ foo: 'bar' });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(getTokenSpy).toHaveBeenCalledTimes(1);

    getTokenSpy.mockClear();
    fetchSpy.mockClear();

    // should use provided value, rather than default
    client.defaultRequestOptions.authorizeRequest = () => true;
    const response3 = await client.fetch('http://localhost:8080/foo', {
      clientId: 'foo',
      scopes: ['a', 'b', 'c'],
      method: 'POST',
      redirect: 'manual',
      authorizeRequest: false
    });

    expect(response3).toBeInstanceOf(Response);
    expect(response3.status).toEqual(200);
    expect(await response3.json()).toEqual({ foo: 'bar' });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(getTokenSpy).toHaveBeenCalledTimes(0);     // not called because authorizeRequest=false
  });

  describe('retries', () => {
    it('will retry a limited number of times', async () => {
      const { client, mockOrchestrator, fetchSpy } = context;
      jest.spyOn(mockOrchestrator, 'getToken').mockResolvedValue(makeTestToken());
      jest.spyOn(client, 'getRetryDelay').mockReturnValue(0);   // ignore 429 backoff for this test

      fetchSpy.mockResolvedValue(new Response(null, { status: 429, statusText: 'Too many requests' }));

      const response = await client.fetch('http://localhost:8080/foo');

      expect(fetchSpy).toHaveBeenCalledTimes(3);
      expect(response).toBeInstanceOf(Response);
      expect(response.status).toEqual(429);
    });

    it('will retry on 429', async () => {
      const { client, mockOrchestrator, fetchSpy } = context;
      jest.spyOn(mockOrchestrator, 'getToken').mockResolvedValue(makeTestToken());
      jest.spyOn(client, 'getRetryDelay').mockReturnValue(0);   // ignore 429 backoff for this test

      fetchSpy
        .mockResolvedValueOnce(new Response(null, { status: 429, statusText: 'Too many requests' }))
        .mockResolvedValueOnce(Response.json({ foo: 'bar' }));

      const response = await client.fetch('http://localhost:8080/foo');

      expect(fetchSpy).toHaveBeenCalledTimes(2);
      // first request returns 429
      expect(fetchSpy.mock.calls[0][0].url).toEqual('http://localhost:8080/foo');
      expect((await fetchSpy.mock.results[0].value).status).toEqual(429);
      // second request succeeds
      expect(fetchSpy.mock.calls[1][0].url).toEqual('http://localhost:8080/foo');
      expect((await fetchSpy.mock.results[1].value).status).toEqual(200);
      // fulfills request with retry
      expect(response).toBeInstanceOf(Response);
      expect(response.status).toEqual(200);
      expect(await response.json()).toEqual({ foo: 'bar' });
    });

    it('will retry *not* on 400', async () => {
      const { client, mockOrchestrator, fetchSpy } = context;
      jest.spyOn(mockOrchestrator, 'getToken').mockResolvedValue(makeTestToken());

      fetchSpy
        .mockResolvedValueOnce(new Response(null, { status: 400, statusText: 'Bad Request' }))
        .mockResolvedValueOnce(Response.json({ foo: 'bar' }));

      const response = await client.fetch('http://localhost:8080/foo');

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy.mock.calls[0][0].url).toEqual('http://localhost:8080/foo');
      expect((await fetchSpy.mock.results[0].value).status).toEqual(400);
      expect(response).toBeInstanceOf(Response);
      expect(response.status).toEqual(400);
      expect(response.statusText).toEqual('Bad Request');
    });

    it('will backoff exponentially on 429 errors', async () => {
      jest.useFakeTimers();

      const { client, mockOrchestrator, fetchSpy } = context;
      jest.spyOn(mockOrchestrator, 'getToken').mockResolvedValue(makeTestToken());
      fetchSpy.mockResolvedValue(new Response(null, { status: 429, statusText: 'Too many requests' }));

      expect(fetchSpy).toHaveBeenCalledTimes(0);
      const promise = client.fetch('http://localhost:8080/foo');
      await jest.advanceTimersByTimeAsync(50);    // needs short delay for first fetch has time to fire

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      await jest.advanceTimersByTimeAsync(500);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      await jest.advanceTimersByTimeAsync(500);

      expect(fetchSpy).toHaveBeenCalledTimes(2);
      await jest.advanceTimersByTimeAsync(1000);
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      await jest.advanceTimersByTimeAsync(1000);

      expect(fetchSpy).toHaveBeenCalledTimes(3);

      const response = await promise;
      expect(response).toBeInstanceOf(Response);
      
      jest.useRealTimers();
    });

    it('will re-auth and retry on 401', async () => {
      const { client, mockOrchestrator, fetchSpy } = context;
      // NOTE: READ - IMPORTANT JEST SPY DETAIL
      // The request object used for the original request is only shallow cloned within
      // the retry logic. Therefore the original object is "updated" prior to firing the
      // retry request. This causes the jest spy (via .mock.calls[0]) *not* to reflect the
      // object values *WHEN* the object was passed, but rather the final state of the object
      // Soluton: Use .mockImplementationOnce twice; the 2nd caches the values of the first
      // request before the 2nd (the retry) request is made
      let firstAuthHeader;
      const orchestratorSpy = jest.spyOn(mockOrchestrator, 'getToken')
        .mockImplementationOnce(() => Promise.resolve(makeTestToken()))
        .mockImplementationOnce(() => {
          firstAuthHeader = fetchSpy.mock.calls[0][0].headers.get('authorization');
          return Promise.resolve(makeTestToken());
        });

      fetchSpy
        .mockResolvedValueOnce(new Response(null, { status: 401, statusText: 'Unauthorized' }))
        .mockResolvedValueOnce(Response.json({ foo: 'bar' }));

      const response = await client.fetch('http://localhost:8080/foo');

      // see note about how `firstAuthHeader` is obtained
      const secondAuthHeader = fetchSpy.mock.calls[1][0].headers.get('authorization');

      expect(orchestratorSpy).toHaveBeenCalledTimes(2);   // 2 tokens will have been fetched
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      // first request returns 401
      expect(fetchSpy.mock.calls[0][0].url).toEqual('http://localhost:8080/foo');
      expect((await fetchSpy.mock.results[0].value).status).toEqual(401);
      // second request succeeds
      expect(fetchSpy.mock.calls[1][0].url).toEqual('http://localhost:8080/foo');
      expect((await fetchSpy.mock.results[1].value).status).toEqual(200);

      // ensures first and second requests truly use different tokens
      const firstAT = (await orchestratorSpy.mock.results[0].value).accessToken;
      const secondAT = (await orchestratorSpy.mock.results[1].value).accessToken;
      expect(firstAuthHeader).toBeDefined();
      expect(secondAuthHeader).toBeDefined();
      expect(firstAuthHeader).not.toEqual(secondAuthHeader);
      expect(firstAT).not.toEqual(secondAT);
      expect(firstAT).toEqual(firstAuthHeader.split(' ')[1]);
      expect(secondAT).toEqual(secondAuthHeader.split(' ')[1]);

      // fulfills request with retry
      expect(response).toBeInstanceOf(Response);
      expect(response.status).toEqual(200);
      expect(await response.json()).toEqual({ foo: 'bar' });
    });

    it('will retry on dpop nonce error', async () => {
      const { client, mockOrchestrator, fetchSpy } = context;

      let firstAuthHeader;
      jest.spyOn(mockOrchestrator, 'getToken')
        .mockResolvedValueOnce(makeTestToken())
        .mockImplementationOnce(() => {
          firstAuthHeader = fetchSpy.mock.calls[0][0].headers.get('authorization');
          return Promise.resolve(makeTestToken());
        });

      const dpopHeaders = new Headers({
        'www-authenticate': 'DPoP error="use_dpop_nonce", error_description="Resource server requires nonce in DPoP proof"',
        'dpop-nonce': randStr(10)
      });

      fetchSpy
        .mockResolvedValueOnce(Response.json(null, { status: 401, headers: dpopHeaders }))
        .mockResolvedValueOnce(Response.json({ foo: 'bar' }));

      await client.fetch('http://localhost:8080/foo');

      const secondAuthHeader = fetchSpy.mock.calls[1][0].headers.get('authorization');

      expect(firstAuthHeader).not.toEqual(secondAuthHeader);
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('will throw when dpop nonce is required but not available', async () => {
      const wwwAuthenticate =
        'DPoP error="use_dpop_nonce", error_description="Resource server requires nonce in DPoP proof"';
      
      const { client, mockOrchestrator, fetchSpy } = context;
      jest.spyOn(mockOrchestrator, 'getToken').mockResolvedValue(makeTestToken());

      const headers = new Headers();
      headers.set('www-authenticate', wwwAuthenticate);
      fetchSpy
        .mockResolvedValueOnce(new Response(null, { status: 401, statusText: 'Unauthorized', headers }))
        .mockResolvedValueOnce(Response.json({ foo: 'bar' }));
  
      await expect(client.fetch('http://localhost:8080/foo')).rejects.toThrow(APIClientError);
    });

    it('should maintain dpopNonce when retrying (for a non-dpop nonce reason)', async () => {
      const { client, mockOrchestrator, fetchSpy } = context;
      jest.spyOn(mockOrchestrator, 'getToken').mockResolvedValue(makeTestToken());
      jest.spyOn((client as any), 'send');
      jest.spyOn((client as any), 'processErrorResponse');

      const dpopNonce = randStr(10);

      const dpopHeaders = new Headers({
        'www-authenticate': 'DPoP error="use_dpop_nonce", error_description="Resource server requires nonce in DPoP proof"',
        'dpop-nonce': dpopNonce
      });

      const acrStepUpHeaders = new Headers({
        'www-authenticate': 'error="insufficient_user_authentication", error_description="A different authentication level is required", ' +
        'acr_values="urn:okta:loa:1fa:any", max_age=5'
      });

      fetchSpy
        .mockResolvedValueOnce(new Response(null, { status: 401, statusText: 'Unauthorized', headers: dpopHeaders }))
        .mockResolvedValueOnce(new Response(null, { status: 401, statusText: 'Unauthorized', headers: acrStepUpHeaders }))
        .mockResolvedValueOnce(Response.json({ foo: 'bar' }));

      const response = await client.fetch('http://localhost:8080/foo');

      expect(fetchSpy).toHaveBeenCalledTimes(3);
      expect(client.send).toHaveBeenCalledTimes(3);
      expect(client.processErrorResponse).toHaveBeenCalledTimes(2);
      expect(client.send.mock.calls[1][0]?.context).toEqual({ dpopNonce });
      expect(client.send.mock.calls[2][0]?.context).toEqual({ dpopNonce });
      expect(response.status).toEqual(200);
    });
  });

  // TODO: test abort controller
});
