import { Token } from '@okta/auth-foundation';
import { TokenOrchestrator, TokenOrchestratorError } from 'src/TokenOrchestrator';
import { makeTestToken } from '../helpers/makeTestResource';

// Mock DPoP token (and signingAuthority)
const testToken = makeTestToken(null, { tokenType: 'DPoP' });
testToken.dpopSigningAuthority.sign = jest.fn().mockImplementation(async (request) => {
  request.headers.set('dpop', 'fakedpopvalue');
  return request;
});

// Extend and mock abstract methods to test default implementation
// of non-abstract methods
class TestOrchestrator extends TokenOrchestrator {
  async getToken (): Promise<Token | null> {
    return testToken;
  }
}

describe('TokenOrchestrator', () => {
  describe('authorize impl', () => {
    it('should sign request with dpop signature', async () => {
      const orch = new TestOrchestrator();
      const request = await orch.authorize('/foo');
      expect(request).toBeInstanceOf(Request);
      expect(request.headers.get('dpop')).toBe('fakedpopvalue');
      expect(request.headers.get('authorization')).toBe(`DPoP ${testToken.accessToken}`);
    });

    it('throw if no token is return', async () => {
      const orch = new TestOrchestrator();
      jest.spyOn(orch, 'getToken').mockResolvedValue(null);
      await expect(orch.authorize('/foo')).rejects
        .toThrow(new TokenOrchestratorError('Unable to acquire token to sign request'));
    });
  });
});
