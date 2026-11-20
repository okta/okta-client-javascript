import { DPoPError } from 'src/errors';
import { JWT } from 'src/jwt';
import { DPoPSigningAuthorityImpl, DPoPStorage } from 'src/oauth2/dpop';


describe('DPoPSigningAuthority', () => {
  let authority: DPoPSigningAuthorityImpl;
  let keyPairId: string;

  beforeEach(async () => {
    authority = new DPoPSigningAuthorityImpl(new DPoPStorage.MemoryStore());
    keyPairId = await authority.createDPoPKeyPair();
  });

  const getProofClaims = (request: Request) => new JWT(request.headers.get('dpop')!).claims;

  describe('sign', () => {
    it('signs a request with a dpop proof', async () => {
      const request = new Request('https://example.com/foo/bar?baz=1', { method: 'POST' });
      await authority.sign(request, { keyPairId, nonce: 'nonce' });

      const claims = getProofClaims(request);
      expect(claims.htm).toBe('POST');
      expect(claims.htu).toBe('https://example.com/foo/bar');
      expect(claims.nonce).toBe('nonce');
    });
  });

  describe('events', () => {
    it('emits `will_sign_proof` and `did_sign_proof` when a proof is signed', async () => {
      const willSign = jest.fn();
      const didSign = jest.fn();
      authority.emitter.on('will_sign_proof', willSign);
      authority.emitter.on('did_sign_proof', didSign);

      const request = new Request('https://example.com/foo');
      await authority.sign(request, { keyPairId });

      expect(willSign).toHaveBeenCalledTimes(1);
      expect(willSign).toHaveBeenCalledWith({
        request,
        claims: expect.objectContaining({ htm: 'GET', htu: 'https://example.com/foo' })
      });
      expect(didSign).toHaveBeenCalledTimes(1);
      expect(didSign).toHaveBeenCalledWith({ request, proof: request.headers.get('dpop') });
    });

    it('`will_sign_proof` listeners can modify claims', async () => {
      authority.emitter.on('will_sign_proof', ({ claims }) => {
        claims.htu = 'https://api.example.com/foo';
      });

      const request = new Request('https://proxy.example.com/foo');
      await authority.sign(request, { keyPairId });

      const claims = getProofClaims(request);
      expect(claims.htu).toBe('https://api.example.com/foo');
      // claims which are not modified are retained
      expect(claims.htm).toBe('GET');
      expect(claims.jti).toEqual(expect.any(String));
    });

    it('`will_sign_proof` modifications are applied in listener registration order', async () => {
      const seen: string[] = [];
      authority.emitter.on('will_sign_proof', ({ claims }) => {
        claims.htu = 'https://first.example.com/foo';
      });
      authority.emitter.on('will_sign_proof', ({ claims }) => {
        seen.push(claims.htu);
        claims.htu = 'https://second.example.com/foo';
      });

      const request = new Request('https://example.com/foo');
      await authority.sign(request, { keyPairId });

      expect(seen).toEqual(['https://first.example.com/foo']);
      expect(getProofClaims(request).htu).toBe('https://second.example.com/foo');
    });

    it('emits `error` and re-throws when a proof cannot be generated', async () => {
      const onError = jest.fn();
      const didSign = jest.fn();
      authority.emitter.on('error', onError);
      authority.emitter.on('did_sign_proof', didSign);

      const request = new Request('https://example.com/foo');
      await expect(authority.sign(request, { keyPairId: 'unknown' })).rejects.toThrow(DPoPError);

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith({ request, error: expect.any(DPoPError) });
      expect(didSign).not.toHaveBeenCalled();
      expect(request.headers.has('dpop')).toBe(false);
    });
  });
});
