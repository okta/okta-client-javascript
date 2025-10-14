import { TokenOrchestrator, TokenOrchestratorError } from '@okta/auth-foundation';
import { mockTokenResponse } from '@repo/jest-helpers/browser/helpers';
import { Token } from 'src/platform';
import { HostOrchestrator } from 'src/orchestrators';
import { SecureChannel } from 'src/utils/SecureChannel';


// Mock DPoP token (and signingAuthority)
const testToken = new Token(mockTokenResponse(null, { tokenType: 'DPoP' }));
// @ts-expect-error - forcing property for testing
testToken.context = { dpopPairId: 'dpopkey' };
testToken.dpopSigningAuthority.sign = jest.fn().mockImplementation(async (request) => {
  request.headers.set('dpop', 'fakedpopvalue');
  return request;
});

class MockHost extends HostOrchestrator.Host {
  async findToken(): Promise<Token | HostOrchestrator.ErrorResponse> {
    return testToken;
  }
}

class MockOrchestrator extends TokenOrchestrator {
  async getToken(): Promise<Token | null> {
    return testToken;
  }
}

describe('HostOrchestrator', () => {
  const authParams = {
    issuer: 'http://fake.okta.com',
    clientId: 'fakeClientId',
    scopes: ['openid', 'profile', 'offline_access']
  };

  describe('HostOrchestrator.Host', () => {
    beforeEach(() => {
      jest.spyOn(window, 'postMessage').mockImplementation((data) => {
        const msg = new MessageEvent('message', {
          data,
          origin: location.href,
          source: window,
        });
  
        window.dispatchEvent(msg);
      });
      // jest MessageEvents all return `isTrusted: false`, only way to override this
      jest.spyOn((SecureChannel.prototype as any), 'isTrustedMessage').mockReturnValue(true);
    });

    it('.activate / .close', () => {
      const listener = jest.fn();
      window.addEventListener('message', listener);
      const activateSpy = jest.spyOn(MockHost.prototype, 'activate');
      // don't pollute logs with warnings during testing
      jest.spyOn(console, 'warn').mockReturnValue(undefined);

      const host1 = new MockHost('TestHost');
      expect(host1).toBeInstanceOf(HostOrchestrator.Host);
      expect(host1.isActive).toBe(true);
      expect(activateSpy).toHaveBeenCalledTimes(1);
      expect(listener.mock.lastCall?.[0]?.data).toMatchObject({
        message: {
          eventName: 'ACTIVATED',
          hostId: host1.id
        }
      });

      const duplicateHostListener = jest.fn();
      host1.on('duplicate_host', duplicateHostListener);

      const host2 = new MockHost('TestHost');
      expect(host2).toBeInstanceOf(HostOrchestrator.Host);
      expect(host2.isActive).toBe(true);
      expect(activateSpy).toHaveBeenCalledTimes(2);
      expect(listener.mock.lastCall?.[0]?.data).toMatchObject({
        message: {
          eventName: 'ACTIVATED',
          hostId: host2.id
        }
      });
      expect(duplicateHostListener).toHaveBeenCalledTimes(1);
      expect(duplicateHostListener.mock.lastCall?.[0]).toMatchObject({
        id: host1.id,
        duplicateId: host2.id
      });

      // should not auto-activate since `window.top` is null (mocking iframe mounting)
      jest.spyOn((HostOrchestrator.Host as any).prototype, 'shouldActive').mockReturnValue(false);
      const host3 = new MockHost('TestHost');
      expect(host3.isActive).toBe(false);
      expect(activateSpy).toHaveBeenCalledTimes(2);
      expect(duplicateHostListener).toHaveBeenCalledTimes(1);

      // manually activate
      host3.activate();
      expect(host3.isActive).toBe(true);
      expect(activateSpy).toHaveBeenCalledTimes(3);
      expect(duplicateHostListener).toHaveBeenCalledTimes(2);

      const host4 = new MockHost('TestHost--FOO');
      host4.activate();   // iframe mock still in place, requires manual activation
      expect(host4.isActive).toBe(true);
      expect(activateSpy).toHaveBeenCalledTimes(4);
      // host4 is named differently, therefore does not trigger dup host event
      expect(duplicateHostListener).toHaveBeenCalledTimes(2);

      // clean up, important to not bleed into other tests
      host1.close(); host2.close(); host3.close(); host4.close();
      expect(host1.isActive).toBe(false);
      expect(host2.isActive).toBe(false);
      expect(host3.isActive).toBe(false);
      expect(host4.isActive).toBe(false);

      host1.off('duplicate_host', duplicateHostListener);
      window.removeEventListener('message', listener);
    });

    describe('events', () => {
      let host;
      let event;
      let listeners;

      beforeEach(() => {
        host = new MockHost('TestHost');
        event = {
          requestId: 'mockReqId',
          data: {}
        };
        listeners = {};
        listeners.received = jest.fn();
        listeners.fulfilled = jest.fn();

        host.on('request_received', listeners.received);
        host.on('request_fulfilled', listeners.fulfilled);
      });

      afterEach(() => {
        host.close();
        host.off('request_received', listeners.received);
        host.off('request_fulfilled', listeners.fulfilled);
      });
      
      // NOTE: 'ACTIVATED' tested it .activate tests

      it('PING', async () => {
        const reply = jest.fn();
        event.eventName = 'PING';
        await host.parseRequest(event, reply);
        expect(reply).toHaveBeenCalled();
        expect(reply).toHaveBeenLastCalledWith({ message: 'PONG' });
        expect(listeners.received).toHaveBeenCalledTimes(1);
        expect(listeners.received.mock.lastCall[0]).toMatchObject({ request: event });
        expect(listeners.fulfilled).toHaveBeenCalledTimes(1);
        expect(listeners.fulfilled.mock.lastCall[0]).toMatchObject({
          request: event,
          response: { message: 'PONG' }
        });
      });

      it('TOKEN', async () => {
        const findTokenSpy = jest.spyOn(host, 'findToken');
        const reply = jest.fn();
        event.eventName = 'TOKEN';
        event.data = {
          issuer: 'mockIssuer',
          clientId: 'mockClientId',
          scopes: ['mock', 'scopes']
        };

        // happy path
        await host.parseRequest(event, reply);
        expect(reply).toHaveBeenCalled();
        expect(reply).toHaveBeenLastCalledWith({ token: testToken.toJSON() });
        expect(findTokenSpy).toHaveBeenCalled();
        expect(findTokenSpy).toHaveBeenLastCalledWith(event.data);
        expect(listeners.received).toHaveBeenCalledTimes(1);
        expect(listeners.received.mock.lastCall[0]).toMatchObject({ request: event });
        expect(listeners.fulfilled).toHaveBeenCalledTimes(1);
        expect(listeners.fulfilled.mock.lastCall[0]).toMatchObject({
          request: event,
          response: { token: testToken.toJSON() }
        });

        // no token acquired (null)
        findTokenSpy.mockResolvedValue(null);

        await host.parseRequest(event, reply);
        expect(reply).toHaveBeenCalled();
        expect(reply).toHaveBeenLastCalledWith({ error: 'Unable to obtain token' });
        expect(findTokenSpy).toHaveBeenCalledTimes(2);
        expect(findTokenSpy).toHaveBeenLastCalledWith(event.data);
        expect(listeners.received).toHaveBeenCalledTimes(2);
        expect(listeners.received.mock.lastCall[0]).toMatchObject({ request: event });
        expect(listeners.fulfilled).toHaveBeenCalledTimes(2);
        expect(listeners.fulfilled.mock.lastCall[0]).toMatchObject({
          request: event,
          response: { error: 'Unable to obtain token' }
        });

        // error case
        findTokenSpy.mockResolvedValue({ error: 'some error occurred' });

        await host.parseRequest(event, reply);
        expect(reply).toHaveBeenCalled();
        expect(reply).toHaveBeenLastCalledWith({ error: 'some error occurred'});
        expect(findTokenSpy).toHaveBeenCalledTimes(3);
        expect(findTokenSpy).toHaveBeenLastCalledWith(event.data);
        expect(listeners.received).toHaveBeenCalledTimes(3);
        expect(listeners.received.mock.lastCall[0]).toMatchObject({ request: event });
        expect(listeners.fulfilled).toHaveBeenCalledTimes(3);
        expect(listeners.fulfilled.mock.lastCall[0]).toMatchObject({
          request: event,
          response: { error: 'some error occurred' }
        });
      });

      it('AUTHORIZE', async () => {
        const findTokenSpy = jest.spyOn(host, 'findToken');
        const reply = jest.fn();
        event.eventName = 'AUTHORIZE';
        const authParams = {
          issuer: 'mockIssuer',
          clientId: 'mockClientId',
          scopes: ['mock', 'scopes']
        };
        event.data = {
          ...authParams,
          url: 'http://localhost:8080/foo',
          method: 'GET',
        };

        // happy path (non-dpop)
        const nonDpopToken = new Token(mockTokenResponse());
        findTokenSpy.mockResolvedValueOnce(nonDpopToken);
        await host.parseRequest(event, reply);
        expect(reply).toHaveBeenCalled();
        expect(reply).toHaveBeenLastCalledWith({
          tokenType: nonDpopToken.tokenType,
          authorization: `${nonDpopToken.tokenType} ${nonDpopToken.accessToken}`
        });
        expect(findTokenSpy).toHaveBeenCalled();
        expect(findTokenSpy).toHaveBeenLastCalledWith(authParams);
        expect(listeners.received).toHaveBeenCalledTimes(1);
        expect(listeners.received.mock.lastCall[0]).toMatchObject({ request: event });
        expect(listeners.fulfilled).toHaveBeenCalledTimes(1);
        expect(listeners.fulfilled.mock.lastCall[0]).toMatchObject({
          request: event,
          response: {
            tokenType: nonDpopToken.tokenType,
            authorization: `${nonDpopToken.tokenType} ${nonDpopToken.accessToken}`
          }
        });

        // happy path
        await host.parseRequest(event, reply);
        expect(reply).toHaveBeenCalled();
        expect(reply).toHaveBeenLastCalledWith({
          tokenType: testToken.tokenType,
          authorization: `${testToken.tokenType} ${testToken.accessToken}`,
          dpop: 'fakedpopvalue'
        });
        expect(findTokenSpy).toHaveBeenCalled();
        expect(findTokenSpy).toHaveBeenLastCalledWith(authParams);
        expect(listeners.received).toHaveBeenCalledTimes(2);
        expect(listeners.received.mock.lastCall[0]).toMatchObject({ request: event });
        expect(listeners.fulfilled).toHaveBeenCalledTimes(2);
        expect(listeners.fulfilled.mock.lastCall[0]).toMatchObject({
          request: event,
          response: {
            tokenType: testToken.tokenType,
            authorization: `${testToken.tokenType} ${testToken.accessToken}`,
            dpop: 'fakedpopvalue'
          }
        });

        // no token acquired (null)
        findTokenSpy.mockResolvedValue(null);

        await host.parseRequest(event, reply);
        expect(reply).toHaveBeenCalled();
        expect(reply).toHaveBeenLastCalledWith({ error: 'Unable to sign request' });
        expect(findTokenSpy).toHaveBeenCalledTimes(3);
        expect(findTokenSpy).toHaveBeenLastCalledWith(authParams);
        expect(listeners.received).toHaveBeenCalledTimes(3);
        expect(listeners.received.mock.lastCall[0]).toMatchObject({ request: event });
        expect(listeners.fulfilled).toHaveBeenCalledTimes(3);
        expect(listeners.fulfilled.mock.lastCall[0]).toMatchObject({
          request: event,
          response: { error: 'Unable to sign request' }
        });

        // error case 1 - findToken returns error
        findTokenSpy.mockResolvedValue({ error: 'some error' });

        await host.parseRequest(event, reply);
        expect(reply).toHaveBeenCalled();
        expect(reply).toHaveBeenLastCalledWith({ error: 'some error' });
        expect(findTokenSpy).toHaveBeenCalledTimes(4);
        expect(findTokenSpy).toHaveBeenLastCalledWith(authParams);
        expect(listeners.received).toHaveBeenCalledTimes(4);
        expect(listeners.received.mock.lastCall[0]).toMatchObject({ request: event });
        expect(listeners.fulfilled).toHaveBeenCalledTimes(4);
        expect(listeners.fulfilled.mock.lastCall[0]).toMatchObject({
          request: event,
          response: { error: 'some error' }
        });

        // error case 2 - dpop header never added (should never occur)
        testToken.dpopSigningAuthority.sign = jest.fn().mockImplementation(req => req);
        findTokenSpy.mockResolvedValueOnce(testToken);

        await host.parseRequest(event, reply);
        expect(reply).toHaveBeenCalled();
        expect(reply).toHaveBeenLastCalledWith({ error: 'Unable to sign request' });
        expect(findTokenSpy).toHaveBeenCalledTimes(5);
        expect(findTokenSpy).toHaveBeenLastCalledWith(authParams);
        expect(listeners.received).toHaveBeenCalledTimes(5);
        expect(listeners.received.mock.lastCall[0]).toMatchObject({ request: event });
        expect(listeners.fulfilled).toHaveBeenCalledTimes(5);
        expect(listeners.fulfilled.mock.lastCall[0]).toMatchObject({
          request: event,
          response: { error: 'Unable to sign request' }
        });

        // error case 3 - request params (url, method) not provided
        event.data = authParams;

        await host.parseRequest(event, reply);
        expect(reply).toHaveBeenCalled();
        expect(reply).toHaveBeenLastCalledWith({ error: 'request url or method not provided' });
        expect(findTokenSpy).toHaveBeenCalledTimes(5);    // error is thrown before .findToken() gets called
        expect(findTokenSpy).toHaveBeenLastCalledWith(authParams);
        expect(listeners.received).toHaveBeenCalledTimes(6);
        expect(listeners.received.mock.lastCall[0]).toMatchObject({ request: event });
        expect(listeners.fulfilled).toHaveBeenCalledTimes(6);
        expect(listeners.fulfilled.mock.lastCall[0]).toMatchObject({
          request: event,
          response: { error: 'request url or method not provided' }
        });
      });

      it('PROFILE', async () => {
        const findTokenSpy = jest.spyOn(host, 'findToken');
        const reply = jest.fn();
        event.eventName = 'PROFILE';
        event.data = {
          issuer: 'mockIssuer',
          clientId: 'mockClientId',
          scopes: ['mock', 'scopes']
        };

        // happy path
        await host.parseRequest(event, reply);
        expect(reply).toHaveBeenCalled();
        expect(reply).toHaveBeenLastCalledWith({ profile: testToken.idToken?.claims });
        expect(findTokenSpy).toHaveBeenCalled();
        expect(findTokenSpy).toHaveBeenLastCalledWith(event.data);
        expect(listeners.received).toHaveBeenCalledTimes(1);
        expect(listeners.received.mock.lastCall[0]).toMatchObject({ request: event });
        expect(listeners.fulfilled).toHaveBeenCalledTimes(1);
        expect(listeners.fulfilled.mock.lastCall[0]).toMatchObject({
          request: event,
          response: { profile: testToken.idToken?.claims }
        });

        // no token acquired (null)
        findTokenSpy.mockResolvedValue(null);

        await host.parseRequest(event, reply);
        expect(reply).toHaveBeenCalled();
        expect(reply).toHaveBeenLastCalledWith({ error: 'Unable to find idToken' });
        expect(findTokenSpy).toHaveBeenCalledTimes(2);
        expect(findTokenSpy).toHaveBeenLastCalledWith(event.data);
        expect(listeners.received).toHaveBeenCalledTimes(2);
        expect(listeners.received.mock.lastCall[0]).toMatchObject({ request: event });
        expect(listeners.fulfilled).toHaveBeenCalledTimes(2);
        expect(listeners.fulfilled.mock.lastCall[0]).toMatchObject({
          request: event,
          response: { error: 'Unable to find idToken' }
        });

        // error case
        findTokenSpy.mockResolvedValue({ error: 'some error' });

        await host.parseRequest(event, reply);
        expect(reply).toHaveBeenCalled();
        expect(reply).toHaveBeenLastCalledWith({ error: 'some error' });
        expect(findTokenSpy).toHaveBeenCalledTimes(3);
        expect(findTokenSpy).toHaveBeenLastCalledWith(event.data);
        expect(listeners.received).toHaveBeenCalledTimes(3);
        expect(listeners.received.mock.lastCall[0]).toMatchObject({ request: event });
        expect(listeners.fulfilled).toHaveBeenCalledTimes(3);
        expect(listeners.fulfilled.mock.lastCall[0]).toMatchObject({
          request: event,
          response: { error: 'some error' }
        });
      });
    });
  });

  describe('HostOrchestrator.SubApp', () => {
    it('constructs', () => {
      const subOrch1 = new HostOrchestrator.SubApp('Test1');
      expect(subOrch1).toBeInstanceOf(HostOrchestrator.SubApp);
      expect(subOrch1.name).toBe('Test1');

      const subOrch2 = new HostOrchestrator.SubApp('Test2', { targetOrigin: 'http://localhost:8080' });
      expect(subOrch2).toBeInstanceOf(HostOrchestrator.SubApp);
      expect(subOrch2.name).toBe('Test2');

      const subOrch3 = new HostOrchestrator.SubApp('Test3', { ...authParams });
      expect(subOrch3).toBeInstanceOf(HostOrchestrator.SubApp);
      expect(subOrch3.name).toBe('Test3');
      expect((subOrch3 as any).authParams).toEqual(authParams);

      expect(() => {
        return new HostOrchestrator.SubApp('Test', { targetOrigin: 'foo' });
      }).toThrow();
    });

    it('getTokenCacheKey', () => {
      const sub = new HostOrchestrator.SubApp('Test');

      expect((sub as any).getTokenCacheKey()).toBe('DEFAULT');
      expect((sub as any).getTokenCacheKey({ clientId: authParams.clientId })).toBe(authParams.clientId);
      expect((sub as any).getTokenCacheKey({ scopes: authParams.scopes })).toBe(authParams.scopes.join(' '));
      expect((sub as any).getTokenCacheKey(authParams))
        .toBe(`${authParams.clientId}:${authParams.scopes.join(' ')}`);
    });

    describe('getToken', () => {
      it('can request a token or load one from cache', async () => {
        const sub = new HostOrchestrator.SubApp('Test');
  
        const broadcastSpy = jest.spyOn((sub as any), 'broadcast')
          .mockResolvedValue({ token: mockTokenResponse() });
  
        const result1 = await sub.getToken();
        expect(result1).toBeInstanceOf(Token);
        expect(broadcastSpy).toHaveBeenCalledTimes(1);
  
        // ensure identical request token is being read from cache
        const result2 = await sub.getToken();
        expect(result2).toBeInstanceOf(Token);
        expect(Token.isEqual(result1!, result2!)).toBe(true);
        expect(broadcastSpy).toHaveBeenCalledTimes(1);
      });

      it('will resolve the same pending promise for requests with same authParams', async () => {
        const sub = new HostOrchestrator.SubApp('Test');

        const broadcastSpy = jest.spyOn((sub as any), 'broadcast')
          .mockImplementation(() => Promise.resolve({ token: mockTokenResponse() }));

        const request1 = sub.getToken();
        const request2 = sub.getToken({ clientId: 'different' });
        const request3 = sub.getToken();
        expect(request1).not.toBe(request2);
        expect(request1).toEqual(request3);
        const result1 = await request1;
        const result2 = await request2;
        const result3 = await request3;
        expect(result1).toBeInstanceOf(Token);
        expect(result2).toBeInstanceOf(Token);
        expect(result3).toBeInstanceOf(Token);
        expect(Token.isEqual(result1!, result3!)).toBe(true);
        expect(Token.isEqual(result1!, result2!)).toBe(false);
        expect(broadcastSpy).toHaveBeenCalledTimes(2);
      });

      it('will request a new token if cached token is expired', async () => {
        const sub = new HostOrchestrator.SubApp('Test');
  
        const broadcastSpy = jest.spyOn((sub as any), 'broadcast')
          // mocks expired token
          .mockResolvedValueOnce({ token: mockTokenResponse(null, { issuedAt: 100 }) })
          .mockResolvedValue({ token: mockTokenResponse() });

        const result1 = await sub.getToken();
        expect(result1).toBeInstanceOf(Token);
        expect(broadcastSpy).toHaveBeenCalledTimes(1);

        const result2 = await sub.getToken();
        expect(result2).toBeInstanceOf(Token);
        expect(Token.isEqual(result1!, result2!)).toBe(false);
        expect(broadcastSpy).toHaveBeenCalledTimes(2);
      });

      it('throws when host fails to respond (timeout)', async () => {
        jest.useFakeTimers();

        const sub = new HostOrchestrator.SubApp('Test');

        jest.spyOn((sub as any), 'broadcast');

        const promise = expect(sub.getToken()).rejects.toThrow(new TokenOrchestratorError('timeout'));
        await jest.advanceTimersByTimeAsync(5000);
        await promise;

        jest.useRealTimers();
      });

      it('throws when host returns error', async () => {
        const sub = new HostOrchestrator.SubApp('Test');
  
        jest.spyOn((sub as any), 'broadcast')
          .mockResolvedValue({ error: 'some error' });

        await expect(sub.getToken()).rejects.toThrow(new TokenOrchestratorError('some error'));
      });
    });

    it('authorize', async () => {
      const sub = new HostOrchestrator.SubApp('Test');

      const broadcastSpy = jest.spyOn((sub as any), 'broadcast').mockResolvedValue({
        tokenType: 'DPoP',
        authorization: 'authorization header',
        dpop: 'dpop header'
      });

      // Testing DPoP Tokens
      const request1 = new Request('http://localhost:8080/foo');
      const result1 = await sub.authorize(request1);
      expect(result1).toBeInstanceOf(Request);
      expect(result1.headers.get('authorization')).toBe('authorization header');
      expect(result1.headers.get('dpop')).toBe('dpop header');
      expect(result1.url).toEqual(request1.url);
      expect(result1.method).toEqual('GET');
      expect(broadcastSpy).toHaveBeenCalledTimes(1);

      const result2 = await sub.authorize('http://localhost:8080/foo', { method: 'POST' });
      expect(result2).toBeInstanceOf(Request);
      expect(result2.headers.get('authorization')).toBe('authorization header');
      expect(result2.headers.get('dpop')).toBe('dpop header');
      expect(result2.url).toEqual('http://localhost:8080/foo');
      expect(result2.method).toEqual('POST');
      expect(broadcastSpy).toHaveBeenCalledTimes(2);

      broadcastSpy.mockResolvedValue({
        tokenType: 'Bearer',
        authorization: 'authorization header',
      });

      // Testing Bearer Tokens
      const result3 = await sub.authorize('http://localhost:8080/foo');
      expect(result3).toBeInstanceOf(Request);
      expect(result3.headers.get('authorization')).toBe('authorization header');
      expect(result3.method).toEqual('GET');
      expect(broadcastSpy).toHaveBeenCalledTimes(3);
    
      // Error Scenarios
      broadcastSpy.mockResolvedValue({
        tokenType: 'DPoP',
        authorization: 'authorization header',
      });
      await expect(sub.authorize('http://localhost:8080/foo')).rejects.toThrow(new TokenOrchestratorError('No DPoP header received when expected'));
    
      broadcastSpy.mockResolvedValue({
        tokenType: 'DPoP',
        dpop: '',
        authorization: 'authorization header',
      });
      await expect(sub.authorize('http://localhost:8080/foo')).rejects.toThrow(new TokenOrchestratorError('No DPoP header received when expected'));

      broadcastSpy.mockResolvedValue({
        authorization: ''
      });
      await expect(sub.authorize('http://localhost:8080/foo')).rejects.toThrow(new TokenOrchestratorError('No Authorization header received'));

      broadcastSpy.mockResolvedValue({});
      await expect(sub.authorize('http://localhost:8080/foo')).rejects.toThrow(new TokenOrchestratorError('No Authorization header received'));
    });

    describe('pingHost' , () => {
      it('returns true when host responds', async () => {
        const sub = new HostOrchestrator.SubApp('Test');
  
        const broadcastSpy = jest.spyOn((sub as any), 'broadcast')
          .mockResolvedValue({ message: 'PONG' });
  
        const result = await sub.pingHost();
        expect(result).toBe(true);
        expect(broadcastSpy).toHaveBeenCalled();
      });

      it('will continuously ping for host, if not immediately available', async () => {
        jest.useFakeTimers();

        const sub = new HostOrchestrator.SubApp('Test');
        const broadcastSpy = jest.spyOn((sub as any), 'broadcast');

        const promise = sub.pingHost();
        await jest.advanceTimersByTimeAsync(100);

        broadcastSpy.mockResolvedValue({ message: 'PONG' });

        await jest.advanceTimersByTimeAsync(100);

        const result = await promise;
        expect(result).toBe(true);
        expect(broadcastSpy).toHaveBeenCalledTimes(3);

        jest.useRealTimers();
      });

      it('returns false if no response is received', async () => {
        jest.useFakeTimers();

        const sub = new HostOrchestrator.SubApp('Test');
        const broadcastSpy = jest.spyOn((sub as any), 'broadcast');
  
        const promise = sub.pingHost();
        await jest.advanceTimersByTimeAsync(500);
        const result = await promise;
        expect(result).toBe(false);
        expect(broadcastSpy).toHaveBeenCalledTimes(5);

        broadcastSpy.mockClear();

        const promise2 = sub.pingHost({ attempts: 3 });
        await jest.advanceTimersByTimeAsync(300);
        const result2 = await promise2;
        expect(result2).toBe(false);
        expect(broadcastSpy).toHaveBeenCalledTimes(3);

        broadcastSpy.mockClear();

        const promise3 = sub.pingHost({ interval: 50 });
        await jest.advanceTimersByTimeAsync(250);
        const result3 = await promise3;
        expect(result3).toBe(false);
        expect(broadcastSpy).toHaveBeenCalledTimes(5);
  
        jest.useRealTimers();
      });
    });
  });

  describe('Host <-- --> SubApp', () => {
    beforeEach(() => {
      jest.spyOn(window, 'postMessage').mockImplementation((data) => {
        const msg = new MessageEvent('message', {
          data,
          origin: location.href,
          source: window,
        });
  
        window.dispatchEvent(msg);
      });
      // jest MessageEvents all return `isTrusted: false`, only way to override this
      jest.spyOn((SecureChannel.prototype as any), 'isTrustedMessage').mockReturnValue(true);
    });

    test('SubApp can request token from Host', async () => {
      const host = new MockHost('Test');
      const sub = new HostOrchestrator.SubApp('Test');

      const parseReqSpy = jest.spyOn((host as any), 'parseRequest');
      const result = await sub.pingHost();
      expect(parseReqSpy).toHaveBeenCalledTimes(1);
      expect(result).toBe(true);
    });
  });

  describe('HostOrchestrator.ProxyHost', () => {
    it('adapts a TokenOrchestrator into a Host', async () => {
      const orchestrator = new MockOrchestrator();
      const host = new HostOrchestrator.ProxyHost('Test', orchestrator);
      expect(host).toBeInstanceOf(HostOrchestrator.Host);
      await expect(host.findToken()).resolves.toEqual(testToken);
    });

    it('throws if a SubApp is provided', () => {
      const subapp = new HostOrchestrator.SubApp('Test');
      expect(() => new HostOrchestrator.ProxyHost('Test', subapp)).toThrow(TypeError);
    });
  });

});
