import { APIClientError } from 'src/errors';
import { APIClient, APIRequest } from 'src/http';

// abstract class requires mock impl to test
class MockAPIClient extends APIClient {
  defaultHeaders = { 'X-Okta-User-Agent-Extended': 'fake-useragent' };

  protected async checkForDPoPNonceErrorResponse(): Promise<string | undefined> {
    return undefined;
  }

  protected async prepareDPoPNonceRetry(): Promise<void> {
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
    const response = await client.fetch('http://localhost:8080/');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(response).toBeInstanceOf(Response);
  });

  it('will append defaultHeaders to outgoing requests', async () => {
    const client = new MockAPIClient();
    const response = await client.fetch('http://localhost:8080/');
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
        const request = new APIRequest('http://localhost:8080/');
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
        const request = new APIRequest('http://localhost:8080/');
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
        const request = new APIRequest('http://localhost:8080/');
        const response = await (client as any).sendRequest(request);
        expect(fetchSpy).toHaveBeenCalled();
        expect(response).toBeInstanceOf(Response);
      });

      it('will use custom fetch implementation', async () => {
        const fetchImpl = jest.fn().mockResolvedValue(Response.json({}));
        const client = new MockAPIClient({ fetchImpl });
        const request = new APIRequest('http://localhost:8080/');
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
        const request = new Request('http://localhost:8080/');
        expect(request.headers.get('X-Okta-User-Agent-Extended')).toBe(null);
        const response = await client.send(request);
        expect(response).toBeInstanceOf(Response);
        expect(client.processResponse).toHaveBeenCalled();
        expect(client.processErrorResponse).not.toHaveBeenCalled();
      });

      it('will send and process successful request via APIRequest', async () => {
        const request = new APIRequest('http://localhost:8080/');
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
        const request = new Request('http://localhost:8080/');
        expect(request.headers.get('X-Okta-User-Agent-Extended')).toBe(null);
        const response = await client.send(request);
        expect(response).toBeInstanceOf(Response);
        expect(client.processResponse).toHaveBeenCalled();
        expect(client.processErrorResponse).toHaveBeenCalled();
      });

      it('will send and process bad request via APIRequest', async () => {
        fetchSpy.mockResolvedValue(new Response(null, { status: 400, statusText: 'Bad Request' }));
        const request = new APIRequest('http://localhost:8080/');
        expect(request.headers.get('X-Okta-User-Agent-Extended')).toBe(null);
        expect(request.retryAttempt).toBe(0);
        const response = await client.send(request);
        expect(request.headers.get('X-Okta-User-Agent-Extended')).toBe('fake-useragent');
        expect(request.retryAttempt).toBe(0);
        expect(response).toBeInstanceOf(Response);
        expect(client.processResponse).toHaveBeenCalled();
        expect(client.processErrorResponse).toHaveBeenCalled();
      });

      it('will throw when network failure occurs', async () => {
        const error = new TypeError('Failed to fetch');
        fetchSpy.mockRejectedValue(error);
        const request = new APIRequest('http://localhost:8080/');
        expect(request.headers.get('X-Okta-User-Agent-Extended')).toBe(null);
        expect(request.retryAttempt).toBe(0);
        await expect(client.send(request)).rejects.toThrow(new APIClientError('Network failure: request failed to send'));
      });
    });

    it('retry', async () => {
      jest.spyOn(client, 'processResponse');
      jest.spyOn(client, 'processErrorResponse');
      const request = new APIRequest('http://localhost:8080/');
      expect(request.retryAttempt).toBe(0);
      const response = await client.retry(request);
      expect(request.retryAttempt).toBe(1);
      expect(response).toBeInstanceOf(Response);
      expect(client.processResponse).toHaveBeenCalled();
      expect(client.processErrorResponse).not.toHaveBeenCalled();
    });

    describe('getRetryDelay', () => {
      it('will get delay value from `retry-after` header', () => {
        const request = new APIRequest('http://localhost:8080/');
        const retryAfter = Response.json({}, { headers: { 'retry-after': '3' } });
        expect(client.getRetryDelay(retryAfter, request)).toBe(3000);
      });

      it('will default to an exponential backoff value', () => {
        const request = new APIRequest('http://localhost:8080/');
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

      expect(await client.getDPoPNonceFromCache(request)).toEqual(undefined);
      const response1 = await client.send(request.clone());
      expect(response1).toBeInstanceOf(Response);
      expect(await client.getDPoPNonceFromCache(request)).toEqual('nonceuponatime1');
      request.headers.delete('X-Okta-User-Agent-Extended');   // internal detail

      // 2nd request should overwrite cache with new nonce value
      const response2 = await client.send(request.clone());
      expect(response2).toBeInstanceOf(Response);
      expect(await client.getDPoPNonceFromCache(request)).toEqual('nonceuponatime2');
    });

    describe('request interceptor', () => {
      beforeEach(() => {
        fetchSpy.mockImplementation(async req => {
          if (req instanceof Request) {
            // mocks `fetch` behavior, marks Request instance as "used"
            jest.spyOn(req, 'bodyUsed', 'get').mockReturnValue(true);
          }
          return Response.json({});
        });
      });

      it('interceptor allows for customization of outgoing network requests', async () => {
        const interceptor1 = jest.fn().mockImplementation(req => {
          req.headers.append('foo', '1');
          return req;
        });
        const interceptor2 = jest.fn().mockImplementation(req => {
          req.headers.append('bar', '1');
          return req;
        });
        const interceptor3 = jest.fn().mockImplementation(req => {
          const newReq = new Request(req, {
            cache: 'no-cache'
          });
          return newReq;
        });

        client.addInterceptor(interceptor1);
        client.addInterceptor(interceptor2);
        client.addInterceptor(interceptor3);
        client.removeInterceptor(interceptor2);

        const request = new APIRequest('http://localhost:8080/foo');

        expect(request.headers.has('foo')).toBe(false);
        expect(request.headers.has('bar')).toBe(false);
        expect(request.cache).toBe('default');
        await client.send(request);

        let req = fetchSpy.mock.lastCall[0];
        expect(req).toBeInstanceOf(Request);
        expect(req.url).toEqual(request.url);
        expect(req.bodyUsed).toBe(true);
        expect(req.headers.has('foo')).toBe(true);
        expect(req.headers.has('bar')).toBe(false);
        expect(req.cache).toBe('no-cache');
      });

      it('throws if consumed Request is provided', async () => {
        const interceptor = jest.fn().mockImplementation((req: Request) => {
          jest.spyOn(req, 'bodyUsed', 'get').mockReturnValue(true);
          return req;
        });

        client.addInterceptor(interceptor);
        await expect(client.fetch('http://localhost:8080/foo')).rejects.toThrow(APIClientError);
      });
    });

    describe('EventEmitter', () => {
      let handlers: any = {};
      beforeEach(() => {
        const willSend = jest.fn();
        client.emitter.on('will_send', willSend);
        const didSend = jest.fn();
        client.emitter.on('did_send', didSend);
        const networkFailure = jest.fn();
        client.emitter.on('network_failure', networkFailure);

        handlers = { willSend, didSend, networkFailure };
      });

      it('fires events on successful request', async () => {
        const { willSend, didSend, networkFailure } = handlers;

        const request = new Request('http://localhost:8080/foo');
        const response = Response.json({}, { status: 201, statusText: 'Test' });
        fetchSpy.mockResolvedValue(response);

        await client.fetch(request);

        expect(willSend).toHaveBeenCalledTimes(1);
        expect(willSend.mock.lastCall[0]).toMatchObject({ request: expect.any(Request) });
        expect(willSend.mock.lastCall[0].request.url).toEqual(request.url);
        expect(didSend).toHaveBeenCalledTimes(1);
        expect(didSend.mock.lastCall[0]).toMatchObject({ request: expect.any(Request), response: expect.any(Response) });
        expect(didSend.mock.lastCall[0].request.url).toEqual(request.url);
        expect(didSend.mock.lastCall[0].response.status).toEqual(response.status);
        expect(didSend.mock.lastCall[0].response.statusText).toEqual(response.statusText);
        expect(networkFailure).not.toHaveBeenCalled();
      });

      it('fires failure event on iOS devices', async () => {
        expect.assertions(6);   // ensures `catch` is entered below
        const { willSend, didSend, networkFailure } = handlers;

        const request = new Request('http://localhost:8080/foo');
        const error = new TypeError('Load failed');
        fetchSpy.mockRejectedValue(error);

        try {
          await client.fetch(request);
        }
        catch (err) {
          expect(willSend).toHaveBeenCalledTimes(1);
          expect(willSend.mock.lastCall[0]).toMatchObject({ request: expect.any(Request) });
          expect(willSend.mock.lastCall[0].request.url).toEqual(request.url);
          expect(didSend).toHaveBeenCalledTimes(0);
          expect(networkFailure).toHaveBeenCalledTimes(1);
          expect(networkFailure.mock.lastCall[0]).toMatchObject({
            request: expect.any(Request),
            error: new APIClientError('Network failure: request failed to send'),
            cause: error
          });
        }
      });

      it('fires failure event on non-iOS devices', async () => {
        expect.assertions(6);   // ensures `catch` is entered below
        const { willSend, didSend, networkFailure } = handlers;

        const request = new Request('http://localhost:8080/foo');
        const error = new TypeError('Failed to fetch');
        fetchSpy.mockRejectedValue(error);

        try {
          await client.fetch(request);
        }
        catch (err) {
          expect(willSend).toHaveBeenCalledTimes(1);
          expect(willSend.mock.lastCall[0]).toMatchObject({ request: expect.any(Request) });
          expect(willSend.mock.lastCall[0].request.url).toEqual(request.url);
          expect(didSend).toHaveBeenCalledTimes(0);
          expect(networkFailure).toHaveBeenCalledTimes(1);
          expect(networkFailure.mock.lastCall[0]).toMatchObject({
            request: expect.any(Request),
            error: new APIClientError('Network failure: request failed to send'),
            cause: error
          });
        }
      });
    });
  });
});
