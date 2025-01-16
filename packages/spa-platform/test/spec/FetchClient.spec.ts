import { TokenOrchestrator } from 'src/TokenOrchestrator';
import { FetchClient } from 'src/FetchClient';
import { randStr } from '@repo/jest-helpers/browser/helpers';
import { makeTestToken } from '../helpers/makeTestResource';


describe('FetchClient', () => {
  let context: any = {};

  beforeEach(() => {
    class MockOrchestrator extends TokenOrchestrator {
      public getToken() {
        return Promise.resolve(null);
      }
    }

    const fetchSpy = global.fetch = jest.fn();
    const mockOrchestrator = new MockOrchestrator();
    const client = new FetchClient(mockOrchestrator);

    context = { client, mockOrchestrator, fetchSpy };
  });

  it('can make a resource request', async () => {
    const { client, mockOrchestrator, fetchSpy } = context;
    jest.spyOn(mockOrchestrator, 'getToken').mockResolvedValue(makeTestToken());

    fetchSpy.mockResolvedValue(Response.json({ foo: 'bar' }));

    const response = await client.fetch('/foo');

    expect(response).toBeInstanceOf(Response);
    expect(response.status).toEqual(200);
    expect(await response.json()).toEqual({ foo: 'bar' });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('will pass params to upstream methods when provided', async () => {
    const { client, mockOrchestrator, fetchSpy } = context;
    const getTokenSpy = jest.spyOn(mockOrchestrator, 'getToken').mockResolvedValue(makeTestToken());

    fetchSpy.mockResolvedValue(Response.json({ foo: 'bar' }));

    const response = await client.fetch('/foo', {
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
    expect(lastFetchReq.url).toBe('/foo');
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

    fetchSpy.mockResolvedValue(Response.json({ foo: 'bar' }));

    // TODO: update error
    await expect(client.fetch('/foo')).rejects.toThrow(new Error('Unable to acquire token to sign request'));

    expect(orchestratorSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('will throw if fetch fails', async () => {
    const { client, mockOrchestrator, fetchSpy } = context;
    const orchestratorSpy = jest.spyOn(mockOrchestrator, 'getToken').mockResolvedValue(makeTestToken());

    fetchSpy.mockRejectedValue(new Error('foo'));

    // TODO: update error
    await expect(client.fetch('/foo')).rejects.toThrow(new Error('FetchError'));

    expect(orchestratorSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  describe('retries', () => {
    it('will retry a limited number of times', async () => {
      const { client, mockOrchestrator, fetchSpy } = context;
      jest.spyOn(mockOrchestrator, 'getToken').mockResolvedValue(makeTestToken());

      fetchSpy.mockResolvedValue(new Response(null, { status: 429, statusText: 'Too many requests' }));

      const response = await client.fetch('/foo');

      expect(fetchSpy).toHaveBeenCalledTimes(3);
      expect(response).toBeInstanceOf(Response);
      expect(response.status).toEqual(429);
    });

    it('will retry on 429', async () => {
      const { client, mockOrchestrator, fetchSpy } = context;
      jest.spyOn(mockOrchestrator, 'getToken').mockResolvedValue(makeTestToken());

      fetchSpy
        .mockResolvedValueOnce(new Response(null, { status: 429, statusText: 'Too many requests' }))
        .mockResolvedValueOnce(Response.json({ foo: 'bar' }));

      const response = await client.fetch('/foo');

      expect(fetchSpy).toHaveBeenCalledTimes(2);
      // first request returns 429
      expect(fetchSpy.mock.calls[0][0].url).toEqual('/foo');
      expect((await fetchSpy.mock.results[0].value).status).toEqual(429);
      // second request succeeds
      expect(fetchSpy.mock.calls[1][0].url).toEqual('/foo');
      expect((await fetchSpy.mock.results[1].value).status).toEqual(200);
      // fulfills request with retry
      expect(response).toBeInstanceOf(Response);
      expect(response.status).toEqual(200);
      expect(await response.json()).toEqual({ foo: 'bar' });
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

      const response = await client.fetch('/foo');

      // see note about how `firstAuthHeader` is obtained
      const secondAuthHeader = fetchSpy.mock.calls[1][0].headers.get('authorization');

      expect(orchestratorSpy).toHaveBeenCalledTimes(2);   // 2 tokens will have been fetched
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      // first request returns 401
      expect(fetchSpy.mock.calls[0][0].url).toEqual('/foo');
      expect((await fetchSpy.mock.results[0].value).status).toEqual(401);
      // second request succeeds
      expect(fetchSpy.mock.calls[1][0].url).toEqual('/foo');
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

    // TODO:
    xit('will retry on dpop nonce error', async () => {
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

      // const response = await client.fetch('/foo');
      await client.fetch('/foo');

      const secondAuthHeader = fetchSpy.mock.calls[1][0].headers.get('authorization');

      expect(firstAuthHeader).not.toEqual(secondAuthHeader);
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
  });

  // TODO: test abort controller
});
