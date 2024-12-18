jest.mock('src/http/oktaUserAgent', () => {
  return {
    __esModule: true,
    getOktaUserAgent: () => 'fake-useragent'
  };
});

jest.mock('src/utils/SynchronizedResult', () => {
  return {
    __esModule: true,
    SynchronizedResult: class {
      constructor (
        public _,
        public fn,
        public __
      ) {}

      exec () { return this.fn(); }
    }
  };
});

import { Token, TokenJSON } from 'src/Token';
import { OAuth2Client } from 'src/oauth2/client';
import { OAuth2Error, TokenError, JWTError } from 'src/errors';
import { mockTokenResponse } from '@repo/jest-helpers/browser/helpers';

describe('OAuth2Client', () => {
  const params = {
    baseURL: 'https://fake.okta.com',
    clientId: 'fake',
    scopes: 'openid email profile',
  };
  const basicAuthHeader = `Basic ${btoa(params.clientId)}`;

  it('can construct', () => {
    const config = new OAuth2Client.Configuration(params);

    const client1 = new OAuth2Client(config);
    expect(client1).toBeInstanceOf(OAuth2Client);
    const client2 = new OAuth2Client(params);
    expect(client2).toBeInstanceOf(OAuth2Client);
  });

  describe('methods', () => {
    let client;
    beforeEach(() => {
      client = new OAuth2Client(params);
    });

    describe('openIdConfiguration', () => {
      it('should send openid configuration request', async () => {
        const fetchSpy = global.fetch = jest.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({issuer: 'foo'})
        });

        await client.openIdConfiguration();
        expect(fetchSpy).toHaveBeenLastCalledWith(expect.any(Request));

        const lastArg = fetchSpy.mock.lastCall[0];
        expect(lastArg.url).toEqual('https://fake.okta.com/.well-known/openid-configuration');
        expect(lastArg.method).toEqual('GET');
        expect(lastArg.redirect).toEqual('manual');
        expect(lastArg.headers).toEqual(new Headers({
          'accept': 'application/json',
          'X-Okta-User-Agent-Extended': 'fake-useragent'
        }));
      });
    });

    describe('jwks', () => {
      it('should send jwks (/keys) request', async () => {
        jest.spyOn(client, 'openIdConfiguration').mockResolvedValue({ jwks_uri: 'https://fake.okta.com/keys' });

        const fetchSpy = global.fetch = jest.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ keys: [{ kid: 'foo', alg: 'bar'}]})
        });

        await client.jwks();
        expect(fetchSpy).toHaveBeenLastCalledWith(expect.any(Request));

        const lastArg = fetchSpy.mock.lastCall[0];
        expect(lastArg.url).toEqual('https://fake.okta.com/keys');
        expect(lastArg.method).toEqual('GET');
        expect(lastArg.redirect).toEqual('manual');
        expect(lastArg.headers).toEqual(new Headers({
          'accept': 'application/json',
          'X-Okta-User-Agent-Extended': 'fake-useragent'
        }));
      });
    });

    describe('exchange', () => {
      it('should send request to /token', async () => {
        jest.spyOn(client, 'jwks').mockResolvedValue({});

        const fetchSpy = global.fetch = jest.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ keys: [{ kid: 'foo', alg: 'bar'}]})
        });

        const tokenRequest = new Token.TokenRequest({
          openIdConfiguration: {
            issuer: 'https://fake.okta.com',
            token_endpoint: 'https://fake.okta.com/token'
          },
          clientConfiguration: client.configuration,
          grantType: 'authorization_code',
        });
        await client.exchange(tokenRequest);
        expect(fetchSpy).toHaveBeenLastCalledWith(expect.any(Request));

        const lastArg = fetchSpy.mock.lastCall[0];
        expect(lastArg.url).toEqual('https://fake.okta.com/token');
        expect(lastArg.method).toEqual('POST');
        expect(lastArg.headers).toEqual(new Headers({
          'accept': 'application/json',
          'X-Okta-User-Agent-Extended': 'fake-useragent',
          'content-type': 'application/x-www-form-urlencoded;charset=UTF-8'
        }));
        // request.text returns raw request body
        expect(await lastArg.text()).toEqual(new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: 'fake',
        }));
      });
    });

    describe('validateToken', () => {
      it('validates token from token response WITHOUT idToken', async () => {
        jest.spyOn(client, 'openIdConfiguration').mockResolvedValue({
          issuer: 'https://fake.okta.com'
        });
        const idTokenValidatorSpy = jest.spyOn(OAuth2Client.idTokenValidator, 'validate').mockReturnValue(undefined);
        const accessTokenValidatorSpy = jest.spyOn(OAuth2Client.accessTokenValidator, 'validate').mockResolvedValue(undefined);
        const token = new Token(mockTokenResponse('foo', { idToken: undefined }));
        const result = await client.validateToken({}, [], token);
        expect(result).toEqual(token);
        expect(idTokenValidatorSpy).not.toHaveBeenCalled();
        expect(accessTokenValidatorSpy).not.toHaveBeenCalled();
      });

      it('validates token from token response WITH idToken', async () => {
        jest.spyOn(client, 'openIdConfiguration').mockResolvedValue({
          issuer: 'https://fake.okta.com'
        });
        const token = new Token(mockTokenResponse());
        const idTokenValidatorSpy = jest.spyOn(OAuth2Client.idTokenValidator, 'validate').mockReturnValue(undefined);
        const accessTokenValidatorSpy = jest.spyOn(OAuth2Client.accessTokenValidator, 'validate').mockResolvedValue(undefined);
        const verifySigSpy = jest.spyOn(token.idToken!, 'verifySignature').mockResolvedValue(true);
        const result = await client.validateToken({}, [], token);
        expect(result).toEqual(token);
        expect(idTokenValidatorSpy).toHaveBeenCalled();
        expect(accessTokenValidatorSpy).toHaveBeenCalled();
        expect(verifySigSpy).toHaveBeenCalled();
      });

      it('throws when issuer is invalid', async () => {
        jest.spyOn(client, 'openIdConfiguration').mockResolvedValue({
          issuer: 'foobar',
        });
        const token = new Token(mockTokenResponse());
        await expect(client.validateToken({}, [], token)).rejects.toThrow(TokenError);
      });

      it('throws when idToken fails validation', async () => {
        const token = new Token(mockTokenResponse());
        jest.spyOn(client, 'openIdConfiguration').mockResolvedValue({
          issuer: 'https://fake.okta.com'
        });
        jest.spyOn(token.idToken!, 'verifySignature').mockResolvedValue(true);
        await expect(client.validateToken({}, [], token)).rejects.toThrow(JWTError);
      });

      it('throws when accessToken fails validation', async () => {
        const token = new Token(mockTokenResponse());
        jest.spyOn(client, 'openIdConfiguration').mockResolvedValue({
          issuer: 'https://fake.okta.com'
        });

        const err = new JWTError('Signature Invalid');
        jest.spyOn(OAuth2Client.idTokenValidator, 'validate').mockReturnValue(undefined);
        jest.spyOn(OAuth2Client.accessTokenValidator, 'validate').mockRejectedValue(err);
        jest.spyOn(token.idToken!, 'verifySignature').mockResolvedValue(true);
        await expect(client.validateToken({}, [], token)).rejects.toThrow(err);
      });

      it('throws when idToken signature is invalid', async () => {
        const token = new Token(mockTokenResponse());
        jest.spyOn(client, 'openIdConfiguration').mockResolvedValue({
          issuer: 'https://fake.okta.com'
        });
        jest.spyOn(OAuth2Client.idTokenValidator, 'validate').mockReturnValue(undefined);
        jest.spyOn(OAuth2Client.accessTokenValidator, 'validate').mockResolvedValue(undefined);
        jest.spyOn(token.idToken!, 'verifySignature').mockResolvedValue(false);
        await expect(client.validateToken({}, [], token)).rejects.toThrow(new JWTError('Unable to verify id token signature'));
      });
    });

    describe('refresh', () => {
      let performSpy;
      beforeEach(() => {
        performSpy = jest.spyOn(client, 'performRefresh');
      });

      it('should return a new token', async () => {
        const original = new Token(mockTokenResponse());
        const newToken = new Token(mockTokenResponse());
        performSpy.mockResolvedValueOnce(newToken);

        const result = await client.refresh(original);
        expect(performSpy).toHaveBeenCalledTimes(1);
        expect(result).not.toEqual(original);
      });

      it('should throw if no refresh token exists', async () => {
        const token = new Token(mockTokenResponse('foo', { refreshToken: undefined }));
        performSpy.mockResolvedValueOnce(token);
        await expect(() => client.refresh(token)).rejects.toThrow(OAuth2Error);
        expect(performSpy).not.toHaveBeenCalled();
      });

      describe('concurrent requests', () => {
        it('should return same Promise if indential request is made concurrently', async () => {
          const original = new Token(mockTokenResponse());
          const refresh1 = new Token(mockTokenResponse());
          const refresh2 = new Token(mockTokenResponse());
  
          jest.spyOn(client, 'refresh');
  
          let proceed;
          performSpy
            // do not resolve this promise instantly, to allow for subsequent call to be made
            .mockImplementationOnce(() => new Promise((resolve) => {
              proceed = () => resolve(refresh1);
            }))
            .mockResolvedValueOnce(refresh2);
  
          const call1 = client.refresh(original);
          const call2 = client.refresh(original);
          proceed();    // resolves client.performRefresh mock promise
          const result1 = await call1;
          const result2 = await call2;
  
          expect(client.refresh).toHaveBeenCalledTimes(2);
          expect(performSpy).toHaveBeenCalledTimes(1);
          expect(result1).toEqual(result2);
        });

        it('should queue .refresh calls and return the same return if called twice', async () => {
          const token1 = new Token(mockTokenResponse());
          const token2 = new Token(mockTokenResponse());
          const newToken1 = new Token(mockTokenResponse());
          const newToken2 = new Token(mockTokenResponse());
          performSpy
            .mockResolvedValueOnce(newToken1)
            .mockResolvedValueOnce(newToken2)
            .mockResolvedValueOnce(newToken1);
  
          const call1 = client.refresh(token1);
          const call2 = client.refresh(token2);
          const call3 = client.refresh(token1);
          expect(call1).not.toBe(call2);
          expect(call1).toEqual(call3);
          expect(client.queue.size).toEqual(1);
          expect(client.queue.isRunning).toBe(true);
          await call1;
          expect(performSpy).toHaveBeenCalledTimes(2);
        });

        it('should invoke second request if first request results in OAuth error', async () => {
          const original = new Token(mockTokenResponse());
          const refresh1 = new Token(mockTokenResponse());
  
          jest.spyOn(client, 'refresh');
  
          let proceed;
          performSpy
            // do not resolve this promise instantly, to allow for subsequent call to be made
            .mockImplementationOnce(() => new Promise((resolve) => {
              proceed = () => resolve({ error: 'Mock OAuth Error' });
            }))
            .mockResolvedValueOnce(refresh1);
  
          const call1 = client.refresh(original);
          const call2 = client.refresh(original);
          proceed();    // resolves client.performRefresh mock promise
          const result1 = await call1;
          const result2 = await call2;
  
          expect(client.refresh).toHaveBeenCalledTimes(2);
          expect(performSpy).toHaveBeenCalledTimes(2);
          expect(result1).toEqual({ error: 'Mock OAuth Error' });
          expect(result2).toEqual(refresh1);
        });

        it('should result in separate requests when different scopes are requested', async () => {
          const original = new Token(mockTokenResponse());
          const refresh1 = new Token(mockTokenResponse(null, { scopes: 'openid' }));
          const refresh2 = new Token(mockTokenResponse());
  
          jest.spyOn(client, 'refresh');
  
          let proceed;
          performSpy
            // do not resolve this promise instantly, to allow for subsequent call to be made
            .mockImplementationOnce(() => new Promise((resolve) => {
              proceed = () => resolve(refresh1);
            }))
            .mockResolvedValueOnce(refresh2);
  
          const call1 = client.refresh(original, ['openid']);
          const call2 = client.refresh(original);
          proceed();    // resolves client.performRefresh mock promise
          const result1 = await call1;
          const result2 = await call2;
  
          expect(client.refresh).toHaveBeenCalledTimes(2);
          expect(performSpy).toHaveBeenCalledTimes(2);
          expect(result1).toEqual(refresh1);
          expect(result2).toEqual(refresh2);
        });
      });
    });

    describe('performRefresh', () => {
      beforeEach(() => {
        jest.spyOn(client, 'openIdConfiguration').mockResolvedValue({
          issuer: 'https://fake.okta.com',
          token_endpoint: 'https://fake.okta.com/token'
        });
        jest.spyOn(client, 'jwks').mockResolvedValue({});
      });

      it('should send a request to /token', async () => {
        const fetchSpy = global.fetch = jest.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ keys: [{ kid: 'foo', alg: 'bar'}]})
        });

        const tokenResponse = mockTokenResponse();
        const token = new Token({...tokenResponse, context: {}});
        await client.performRefresh(token);
        expect(fetchSpy).toHaveBeenLastCalledWith(expect.any(Request));

        const lastArg = fetchSpy.mock.lastCall[0];
        expect(lastArg.url).toEqual('https://fake.okta.com/token');
        expect(lastArg.method).toEqual('POST');
        expect(lastArg.headers).toEqual(new Headers({
          'accept': 'application/json',
          'X-Okta-User-Agent-Extended': 'fake-useragent',
          'content-type': 'application/x-www-form-urlencoded;charset=UTF-8'
        }));
        // request.text returns raw request body
        expect(await lastArg.text()).toEqual(new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: 'fake',
          scope: 'openid email profile',
          refresh_token: token.refreshToken!
        }));
      });

      it('should throw if no refresh token exists', async () => {
        const token = new Token(mockTokenResponse('foo', { refreshToken: undefined }));
        const response = await client.performRefresh(token);
        expect(response).toEqual({ error: `Missing token: refreshToken` });
      });

      it('should handle token down scoping', async () => {
        jest.spyOn(client, 'validateToken').mockResolvedValue(undefined);

        const downscoped = new Token(mockTokenResponse(null, { scopes: 'openid', refreshToken: 'foobar' }));
        jest.spyOn(client, 'sendTokenRequest').mockResolvedValue(downscoped);
        
        const willRefreshSpy = jest.fn();
        client.emitter.on('token_will_refresh', willRefreshSpy);
        const didRefreshSpy = jest.fn();
        client.emitter.on('token_did_refresh', didRefreshSpy);

        // mock scopes: openid email profile offline_access
        const token = new Token(mockTokenResponse());

        const newToken = await client.refresh(token, ['openid']);
        expect(willRefreshSpy).toHaveBeenCalledWith({ token });
        expect(didRefreshSpy).toHaveBeenCalledTimes(1);
        expect(didRefreshSpy).toHaveBeenCalledWith({
          token: new Token({
            ...token.toJSON() as TokenJSON,
            id: token.id,
            refreshToken: 'foobar'
          })
        });
        expect(newToken).not.toEqual(token);
        expect(newToken.scopes).toEqual(['openid']);
        expect(newToken.refreshToken).not.toEqual(token.refreshToken);
        expect(newToken.refreshToken).toEqual(undefined);
      });
    });

    describe('revoke', () => {
      it('should a send request to revoke a token', async () => {
        jest.spyOn(client, 'openIdConfiguration').mockResolvedValue({
          issuer: 'https://fake.okta.com',
          revocation_endpoint: 'https://fake.okta.com/revoke'
        });

        const fetchSpy = global.fetch = jest.fn().mockResolvedValue({
          ok: true,
          json: () => {}
        });

        const tokenResponse = mockTokenResponse();
        const token = new Token(tokenResponse);
        await client.revoke(token, 'ALL');

        expect(fetchSpy).toHaveBeenCalledTimes(2);
        expect(fetchSpy).toHaveBeenNthCalledWith(1, expect.any(Request));
        expect(fetchSpy).toHaveBeenNthCalledWith(2, expect.any(Request));

        const call1 = fetchSpy.mock.calls[0][0];
        expect(call1.url).toEqual('https://fake.okta.com/revoke');
        expect(call1.method).toEqual('POST');
        expect(call1.headers).toEqual(new Headers({
          'authorization': basicAuthHeader,
          'X-Okta-User-Agent-Extended': 'fake-useragent',
          'content-type': 'application/x-www-form-urlencoded;charset=UTF-8'
        }));
        // request.text returns raw request body
        expect(await call1.text()).toEqual(new URLSearchParams({
          token: token.accessToken,
          token_type_hint: 'access_token'
        }));

        const call2 = fetchSpy.mock.calls[1][0];
        expect(call2.url).toEqual('https://fake.okta.com/revoke');
        expect(call2.method).toEqual('POST');
        expect(call2.headers).toEqual(new Headers({
          'authorization': basicAuthHeader,
          'X-Okta-User-Agent-Extended': 'fake-useragent',
          'content-type': 'application/x-www-form-urlencoded;charset=UTF-8'
        }));
        // request.text returns raw request body
        expect(await call2.text()).toEqual(new URLSearchParams({
          token: token.refreshToken!,
          token_type_hint: 'refresh_token'
        }));

        await client.revoke(token, 'ACCESS');
        expect(fetchSpy).toHaveBeenNthCalledWith(3, expect.any(Request));

        const call3 = fetchSpy.mock.calls[2][0];
        expect(call3.url).toEqual('https://fake.okta.com/revoke');
        expect(call3.method).toEqual('POST');
        expect(call3.headers).toEqual(new Headers({
          'authorization': basicAuthHeader,
          'X-Okta-User-Agent-Extended': 'fake-useragent',
          'content-type': 'application/x-www-form-urlencoded;charset=UTF-8'
        }));
        // request.text returns raw request body
        expect(await call3.text()).toEqual(new URLSearchParams({
          token: token.accessToken,
          token_type_hint: 'access_token'
        }));

        await client.revoke(token, 'REFRESH');
        expect(fetchSpy).toHaveBeenNthCalledWith(4, expect.any(Request));

        const call4 = fetchSpy.mock.calls[3][0];
        expect(call4.url).toEqual('https://fake.okta.com/revoke');
        expect(call4.method).toEqual('POST');
        expect(call4.headers).toEqual(new Headers({
          'authorization': basicAuthHeader,
          'X-Okta-User-Agent-Extended': 'fake-useragent',
          'content-type': 'application/x-www-form-urlencoded;charset=UTF-8'
        }));
        // request.text returns raw request body
        expect(await call4.text()).toEqual(new URLSearchParams({
          token: token.refreshToken!,
          token_type_hint: 'refresh_token'
        }));
      });

      it('should throw if an invalid token type is passed', async () => {
        const internalFetchSpy = jest.spyOn(client, 'internalFetch');
        const token = new Token(mockTokenResponse());
        await expect(client.revoke(token, 'FOO')).rejects.toThrow(
          new Error('Unrecognized Token Type: FOO')
        );
        expect(internalFetchSpy).not.toHaveBeenCalled();
      });

      it('should throw if a refresh token does not exist', async () => {
        const internalFetchSpy = jest.spyOn(client, 'internalFetch');
        const token = new Token(mockTokenResponse('foo', { refreshToken: undefined }));
        await expect(client.revoke(token, 'REFRESH')).rejects.toThrow(
          new TokenError('missing expected token (REFRESH)')
        );
        expect(internalFetchSpy).not.toHaveBeenCalled();
      });

      it('should throw if no `revocation_endpoint` exists', async () => {
        jest.spyOn(client, 'openIdConfiguration')
          .mockResolvedValueOnce({
            issuer: 'https://fake.okta.com',
            // revocation_endpoint: 'https://fake.okta.com/revoke'
          })
          .mockResolvedValueOnce({
            issuer: 'https://fake.okta.com',
            revocation_endpoint: 'randomstring'
          });
        const token = new Token(mockTokenResponse());
        await expect(client.revoke(token, 'ACCESS')).rejects.toThrow(
          new OAuth2Error('missing `revocation_endpoint`')
        );
      });
    });
  });
});
