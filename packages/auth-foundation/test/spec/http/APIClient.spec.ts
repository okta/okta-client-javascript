import { APIClient, APIRequest } from 'src/http';

// abstract class requires mock impl to test
class MockAPIClient extends APIClient {
  defaultHeaders = { 'X-Okta-User-Agent-Extended': 'fake-useragent' };

  protected async checkForDPoPNonceErrorResponse(): Promise<string | undefined> {
    return undefined;
  }

  protected async prepareDPoPNonceRetry(request: APIRequest): Promise<APIRequest> {
    return request;
  }
}

const fetchSpy = global.fetch = jest.fn().mockImplementation(async () => {
  return Response.json({});
});

describe('APIClient', () => {
  beforeEach(() => {
    fetchSpy.mockImplementation(async () => {
      return Response.json({});
    }); 
  });

  it('constructs', () => {
    const client = new MockAPIClient();
    expect(client).toBeInstanceOf(APIClient);
  });

  it('will use custom fetch implementation', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(Response.json({}));
    const client = new MockAPIClient({ fetchImpl });
    const response = await client.fetch('/');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(response).toBeInstanceOf(Response);
  });

  it('will append defaultHeaders to outgoing requests', async () => {
    const client = new MockAPIClient();
    const response = await client.fetch('/');
    expect(response).toBeInstanceOf(Response);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const lastArg = fetchSpy.mock.lastCall[0];
    expect(lastArg.headers.get('X-Okta-User-Agent-Extended')).toEqual('fake-useragent');
  });

  describe('methods', () => {
    let client;
    beforeEach(() => {
      client = new MockAPIClient();
    });

    it('processResponse', async () => {
      const response = Response.json({});
      await expect(client.processResponse(response)).resolves.not.toThrow();
    });

    describe('processErrorResponse', () => {
      it('will return early if Response is <400', async () => {
        jest.spyOn(client, 'checkForDPoPNonceErrorResponse');
        const request = new APIRequest('/');
        const response = Response.json({});
        const result = await client.processErrorResponse(response, request);
        expect(result).toBeInstanceOf(Response);
        expect(client.checkForDPoPNonceErrorResponse).not.toHaveBeenCalled();
      });

      it('will handle a `use_dpop_nonce` error and retry request', async () => {
        jest.spyOn(client, 'send');
        jest.spyOn(client, 'retry');
        jest.spyOn(client, 'checkForDPoPNonceErrorResponse').mockResolvedValue('nonce_upon_a_time');
        jest.spyOn(client, 'prepareDPoPNonceRetry').mockImplementation((request, nonce) => {
          (request as Request).headers.set('dpop', nonce as string);
        });
        
        const response = new Response(null, { status: 400, statusText: 'Bad Request' });
        const request = new APIRequest('/');
        expect(client.send).not.toHaveBeenCalled();
        expect(client.retry).not.toHaveBeenCalled();
        expect(request.retryAttempt).toBe(0);
        expect(request.headers.get('X-Okta-User-Agent-Extended')).toBe(null);
        expect(request.headers.get('dpop')).toBe(null);
        const result = await client.processErrorResponse(response, request);
        expect(result).toBeInstanceOf(Response);
        expect(result.status).toBe(200);
        expect(client.send).toHaveBeenCalled();
        expect(client.retry).toHaveBeenCalled();
        expect(request.retryAttempt).toBe(1);
        expect(request.headers.get('X-Okta-User-Agent-Extended')).toBe('fake-useragent');
        expect(request.headers.get('dpop')).toBe('nonce_upon_a_time');
      });
    });

    describe('sendRequest', () => {
      it('will send a fetch request', async () => {
        const request = new APIRequest('/');
        const response = await (client as any).sendRequest(request);
        expect(fetchSpy).toHaveBeenCalled();
        expect(response).toBeInstanceOf(Response);
      });

      it('will use custom fetch implementation', async () => {
        const fetchImpl = jest.fn().mockResolvedValue(Response.json({}));
        const client = new MockAPIClient({ fetchImpl });
        const request = new APIRequest('/');
        const response = await (client as any).sendRequest(request);
        expect(fetchSpy).not.toHaveBeenCalled();
        expect(fetchImpl).toHaveBeenCalledTimes(1);
        expect(response).toBeInstanceOf(Response);
      });
    });

    describe('send', () => {
      beforeEach(() => {
        jest.spyOn(client, 'processResponse');
        jest.spyOn(client, 'processErrorResponse');
      });

      it('will send and process successful request via Request', async () => {
        const request = new Request('/');
        expect(request.headers.get('X-Okta-User-Agent-Extended')).toBe(null);
        const response = await client.send(request);
        expect(request.headers.get('X-Okta-User-Agent-Extended')).toBe('fake-useragent');
        expect(response).toBeInstanceOf(Response);
        expect(client.processResponse).toHaveBeenCalled();
        expect(client.processErrorResponse).not.toHaveBeenCalled();
      });

      it('will send and process successful request via APIRequest', async () => {
        const request = new APIRequest('/');
        expect(request.headers.get('X-Okta-User-Agent-Extended')).toBe(null);
        expect(request.retryAttempt).toBe(0);
        const response = await client.send(request);
        expect(request.headers.get('X-Okta-User-Agent-Extended')).toBe('fake-useragent');
        expect(request.retryAttempt).toBe(0);
        expect(response).toBeInstanceOf(Response);
        expect(client.processResponse).toHaveBeenCalled();
        expect(client.processErrorResponse).not.toHaveBeenCalled();
      });

      it('will send and process bad request via Request', async () => {
        fetchSpy.mockResolvedValue(new Response(null, { status: 400, statusText: 'Bad Request' }));
        const request = new Request('/');
        expect(request.headers.get('X-Okta-User-Agent-Extended')).toBe(null);
        const response = await client.send(request);
        expect(request.headers.get('X-Okta-User-Agent-Extended')).toBe('fake-useragent');
        expect(response).toBeInstanceOf(Response);
        expect(client.processResponse).toHaveBeenCalled();
        expect(client.processErrorResponse).toHaveBeenCalled();
      });

      it('will send and process bad request via APIRequest', async () => {
        fetchSpy.mockResolvedValue(new Response(null, { status: 400, statusText: 'Bad Request' }));
        const request = new APIRequest('/');
        expect(request.headers.get('X-Okta-User-Agent-Extended')).toBe(null);
        expect(request.retryAttempt).toBe(0);
        const response = await client.send(request);
        expect(request.headers.get('X-Okta-User-Agent-Extended')).toBe('fake-useragent');
        expect(request.retryAttempt).toBe(0);
        expect(response).toBeInstanceOf(Response);
        expect(client.processResponse).toHaveBeenCalled();
        expect(client.processErrorResponse).toHaveBeenCalled();
      });
    });

    it('retry', async () => {
      jest.spyOn(client, 'processResponse');
      jest.spyOn(client, 'processErrorResponse');
      const request = new APIRequest('/');
      expect(request.retryAttempt).toBe(0);
      const response = await client.retry(request);
      expect(request.retryAttempt).toBe(1);
      expect(response).toBeInstanceOf(Response);
      expect(client.processResponse).toHaveBeenCalled();
      expect(client.processErrorResponse).not.toHaveBeenCalled();
    });

    describe('getRetryDelay', () => {
      it('will get delay value from `retry-after` header', () => {
        const request = new APIRequest('/');
        const retryAfter = Response.json({}, { headers: { 'retry-after': '3' } });
        expect(client.getRetryDelay(retryAfter, request)).toBe(3000);
      });

      it('will default to an exponential backoff value', () => {
        const request = new APIRequest('/');
        const response = Response.json({});

        expect(client.getRetryDelay(response, request)).toBe(1000);
        request.markRetry();
        expect(client.getRetryDelay(response, request)).toBe(2000);
        request.markRetry();
        expect(client.getRetryDelay(response, request)).toBe(4000);
      });
    });
  });

  describe('features / capabilities', () => {
    let client;
    beforeEach(() => {
      client = new MockAPIClient();
    });

    it('caches dpop nonce values from responses', async () => {
      // each request should overwrite the cache with a new nonce value
      fetchSpy.mockImplementationOnce(async () => {
        return Response.json({}, { headers: { 'dpop-nonce': 'nonceuponatime1' }});
      })
      .mockImplementationOnce(async () => {
        return Response.json({}, { headers: { 'dpop-nonce': 'nonceuponatime2' }});
      });
      const request = new Request('http://localhost:8080/foo');

      expect(client.getDPoPNonceFromCache(request)).toEqual(undefined);
      const response1 = await client.send(request.clone());
      expect(response1).toBeInstanceOf(Response);
      expect(client.getDPoPNonceFromCache(request)).toEqual('nonceuponatime1');
      request.headers.delete('X-Okta-User-Agent-Extended');   // internal detail

      // 2nd request should overwrite cache with new nonce value
      const response2 = await client.send(request.clone());
      expect(response2).toBeInstanceOf(Response);
      expect(client.getDPoPNonceFromCache(request)).toEqual('nonceuponatime2');
    });
  });
});
