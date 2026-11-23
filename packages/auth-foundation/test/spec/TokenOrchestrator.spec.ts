import { Token } from 'src/Token';
import { TokenOrchestrator } from 'src/TokenOrchestrator';
import { TokenOrchestratorError } from 'src/errors';
import { Platform } from 'src/platform/Platform';
import { makeTestToken } from '../helpers/makeTestResource';


let testToken: Token;

// Extend and mock abstract methods to test default implementation
// of non-abstract methods
class TestOrchestrator extends TokenOrchestrator {
  async getToken (): Promise<Token | null> {
    return testToken;
  }

  async invalidateToken (): Promise<void> {
    return undefined;
  }
}

type CustomParams = TokenOrchestrator.AuthorizeParams & { custom?: string };

class CustomParamsOrchestrator extends TokenOrchestrator<CustomParams> {
  protected readonly authParamKeys = {
    ...TokenOrchestrator.authorizeParamKeys,
    custom: undefined
  } satisfies TokenOrchestrator.AuthorizeParamKeys<CustomParams>;

  async getToken (): Promise<Token | null> {
    return testToken;
  }

  async invalidateToken (): Promise<void> {
    return undefined;
  }
}

describe('TokenOrchestrator', () => {
  beforeEach(() => {
    // Mock DPoP token (and signingAuthority)
    testToken = makeTestToken(null, { tokenType: 'DPoP' });
    jest.spyOn(Platform.DPoPSigningAuthority, 'sign').mockImplementation(async (request) => {
      request.headers.set('dpop', 'fakedpopvalue');
      return request;
    });
  });

  describe('authorize impl', () => {
    it('should sign request with dpop signature', async () => {
      const orch = new TestOrchestrator();
      const { request, tokenId } = await orch.authorize('http://localhost:8080/foo');
      expect(request).toBeInstanceOf(Request);
      expect(request.headers.get('dpop')).toBe('fakedpopvalue');
      expect(request.headers.get('authorization')).toBe(`DPoP ${testToken.accessToken}`);
      expect(tokenId).toEqual(testToken.id);
    });

    it('throw if no token is return', async () => {
      const orch = new TestOrchestrator();
      jest.spyOn(orch, 'getToken').mockResolvedValue(null);
      await expect(orch.authorize('http://localhost:8080/foo')).rejects
        .toThrow(new TokenOrchestratorError('Unable to acquire token to sign request'));
    });

    it('should pass orchestrator-specific params to `getToken`', async () => {
      const orch = new CustomParamsOrchestrator();
      const getTokenSpy = jest.spyOn(orch, 'getToken');
      await orch.authorize('http://localhost:8080/foo', { custom: 'foo', scopes: ['bar'], dpopNonce: 'nonce' });
      expect(getTokenSpy).toHaveBeenCalledWith({ custom: 'foo', scopes: ['bar'] });
      expect(Platform.DPoPSigningAuthority.sign).toHaveBeenCalledWith(
        expect.any(Request),
        expect.objectContaining({ nonce: 'nonce' })
      );
    });

    it('should not pass params unknown to the orchestrator to `getToken`', async () => {
      const orch = new TestOrchestrator();
      const getTokenSpy = jest.spyOn(orch, 'getToken');
      await orch.authorize('http://localhost:8080/foo', { custom: 'foo', scopes: ['bar'] } as any);
      expect(getTokenSpy).toHaveBeenCalledWith({ scopes: ['bar'] });
    });
  });

  describe('extractAuthParams (instance method)', () => {
    it('separates params using the keys of the orchestrator', () => {
      const input = { custom: 'foo', scopes: ['bar'], method: 'POST' };
      expect(new CustomParamsOrchestrator().extractAuthParams(input))
        .toEqual({ authParams: { custom: 'foo', scopes: ['bar'] }, rest: { method: 'POST' } });
      expect(new TestOrchestrator().extractAuthParams(input))
        .toEqual({ authParams: { scopes: ['bar'] }, rest: { custom: 'foo', method: 'POST' } });
    });
  });

  describe('namespace methods', () => {
    it('extractAuthParams', () => {
      const required = {
        issuer: 'http://localhost:8080',
        clientId: 'fake',
        scopes: ['foo', 'bar'],
      };

      const authParams = {
        ...required,
        acrValues: 'some:acr:value',
        maxAge: 10
      };

      expect(TokenOrchestrator.extractAuthParams(authParams)).toEqual({ authParams, rest: {} });
      expect(TokenOrchestrator.extractAuthParams({ ...authParams, foo: 1, bar: 1 })).toEqual({ authParams, rest: { foo: 1, bar: 1} });
      expect(TokenOrchestrator.extractAuthParams({ ...authParams, acrValues: undefined, maxAge: undefined })).toEqual({ authParams: required, rest: {} });
    });

    it('extractAuthParams with custom keys', () => {
      const keys = { ...TokenOrchestrator.authorizeParamKeys, custom: undefined };
      expect(TokenOrchestrator.extractAuthParams({ custom: 'foo', clientId: 'bar', foo: 1 }, keys))
        .toEqual({ authParams: { custom: 'foo', clientId: 'bar' }, rest: { foo: 1 } });
    });
  });
});
