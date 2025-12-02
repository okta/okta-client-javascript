jest.mock('src/http/oktaUserAgent', () => {
  return {
    __esModule: true,
    getOktaUserAgent: () => 'fake-useragent'
  };
});

import { Token, TokenInit } from 'src/Token';
import { OAuth2Client } from 'src/oauth2/client';
import { OAuth2Error, TokenError, JWTError } from 'src/errors';
import { mockTokenResponse } from '@repo/jest-helpers/browser/helpers';

const fetchSpy = global.fetch = jest.fn();


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
      fetchSpy.mockReset();
      client = new OAuth2Client(params);
    });

    describe('openIdConfiguration', () => {
      it('should send openid configuration request', async () => {
        fetchSpy.mockResolvedValue(Response.json({issuer: 'foo'}));

        const result1 = await client.openIdConfiguration();
        const result2 = await client.openIdConfiguration();   // 2nd call should come from cache
        expect(fetchSpy).toHaveBeenCalledTimes(1);
        expect(fetchSpy).toHaveBeenLastCalledWith(expect.any(Request));
        expect(result1).toEqual(result2);

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
        fetchSpy.mockResolvedValue(Response.json({ keys: [{ kid: 'foo', alg: 'bar' }]}));

        const result1 = await client.jwks();
        const result2 = await client.jwks();   // 2nd call should come from cache
        expect(fetchSpy).toHaveBeenCalledTimes(1);
        expect(fetchSpy).toHaveBeenLastCalledWith(expect.any(Request));
        expect(result1).toEqual(result2);

        const lastArg = fetchSpy.mock.lastCall[0];
        expect(lastArg.url).toEqual('https://fake.okta.com/keys');
        expect(lastArg.method).toEqual('GET');
        expect(lastArg.redirect).toEqual('manual');
        expect(lastArg.cache).toEqual('default');
        expect(lastArg.headers).toEqual(new Headers({
          'accept': 'application/json',
          'X-Okta-User-Agent-Extended': 'fake-useragent'
        }));

        fetchSpy.mockResolvedValue(Response.json({ keys: [{ kid: 'foo2', alg: 'bar2' }]}));
        const result3 = await client.jwks({ skipCache: true });
        expect(fetchSpy).toHaveBeenCalledTimes(2);
        expect(result3).toEqual([{ kid: 'foo2', alg: 'bar2' }]);
        expect(fetchSpy.mock.lastCall[0]).toBeInstanceOf(Request);
        expect(fetchSpy.mock.lastCall[0].cache).toEqual('reload');
      });
    });

    describe('exchange', () => {
      it('should send request to /token', async () => {
        jest.spyOn(client, 'jwks').mockResolvedValue({});
        fetchSpy.mockResolvedValue(Response.json(mockTokenResponse()));

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
          client_id: 'fake',
          grant_type: 'authorization_code',
        }).toString());
      });

      it('dpop nonce / cache', async () => {
        client.configuration.dpop = true;
        jest.spyOn(client, 'jwks').mockResolvedValue({});
        jest.spyOn(client.dpopSigningAuthority, 'createDPoPKeyPair').mockResolvedValue('dpopPairId');
        jest.spyOn(client.dpopSigningAuthority, 'sign').mockImplementation((request) => Promise.resolve(request));
        fetchSpy.mockImplementation( () => Response.json({
            token_type: 'DPoP',
            expires_in: 300,
            access_token: 'someaccesstokenvalue',
            scope: 'openid email'
          },
          {
            headers: { 'dpop-nonce': 'nonceuponatime' }
          }
        ));

        const tokenRequest1 = new Token.TokenRequest({
          openIdConfiguration: {
            issuer: 'https://fake.okta.com',
            token_endpoint: 'https://fake.okta.com/token'
          },
          clientConfiguration: client.configuration,
          grantType: 'authorization_code',
        });
        await client.exchange(tokenRequest1);
        expect(fetchSpy).toHaveBeenLastCalledWith(expect.any(Request));
        expect(client.dpopSigningAuthority.sign).toHaveBeenCalledTimes(1);
        expect(client.dpopSigningAuthority.sign).toHaveBeenLastCalledWith(
          expect.any(Request),
          expect.objectContaining({
            keyPairId: 'dpopPairId'
          })
        );

        // subsequent request should use cached nonce
        const tokenRequest2 = new Token.TokenRequest({
          openIdConfiguration: {
            issuer: 'https://fake.okta.com',
            token_endpoint: 'https://fake.okta.com/token'
          },
          clientConfiguration: client.configuration,
          grantType: 'authorization_code',
        });
        await client.exchange(tokenRequest2);
        expect(fetchSpy).toHaveBeenLastCalledWith(expect.any(Request));
        expect(client.dpopSigningAuthority.sign).toHaveBeenCalledTimes(2);
        expect(client.dpopSigningAuthority.sign).toHaveBeenLastCalledWith(
          expect.any(Request),
          expect.objectContaining({
            keyPairId: 'dpopPairId',
            nonce: 'nonceuponatime'
          })
        );
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

      it('throws when a non-DPoP is returned when DPoP is expected', async () => {
        const oauthClient = new OAuth2Client({
          ...params,
          dpop: true
        });
        const token = new Token(mockTokenResponse());
        await expect((oauthClient as any).validateToken({}, [], token))
          .rejects.toThrow(new TokenError(`'${token.tokenType}' token received when DPoP expected`));
      });

      describe('refetches jwks when cached keyset does not contain kid and...', () => {
        beforeEach(() => {
          jest.spyOn(client, 'openIdConfiguration').mockResolvedValue({
            issuer: 'https://fake.okta.com',
            jwks_uri: 'https://fake.okta.com/keys'
          });
          jest.spyOn(client, 'jwks');
          fetchSpy.mockResolvedValue(Response.json({ keys: [{ kid: 'foo', alg: 'bar' }]}));
  
          jest.spyOn(OAuth2Client.idTokenValidator, 'validate').mockReturnValue(undefined);
          jest.spyOn(OAuth2Client.accessTokenValidator, 'validate').mockResolvedValue(undefined);
        });

        it('successfully verifies token with new keyset', async () => {
          const token = new Token(mockTokenResponse());
          // mocks: a re-fetching jwks after a stale keyset fails to contain `kid` and receiving expected key
          const verifySpy = jest.spyOn(token.idToken!, 'verifySignature')
            .mockRejectedValueOnce(new JWTError('No public key found'))     // mocks cache keyset not containing kid
            .mockResolvedValueOnce(true);

          await expect(client.validateToken({}, [], token)).resolves.toBe(token);
          expect(verifySpy).toHaveBeenCalledTimes(2);
          expect(client.openIdConfiguration).toHaveBeenCalledTimes(2);
          expect(client.jwks).toHaveBeenCalledTimes(1);
          expect(client.jwks).toHaveBeenLastCalledWith({ skipCache: true });
        });

        it('throws when keyset still does not contain kid', async () => {
          const token = new Token(mockTokenResponse());

          // mocks: a re-fetching jwks after a stale keyset fails to contain `kid` and STILL not receiving the expected key
          const verifySpy = jest.spyOn(token.idToken!, 'verifySignature')
            .mockRejectedValue(new JWTError('No public key found'));     // mocks cache keyset not containing kid
          
          await expect(client.validateToken({}, [], token)).rejects.toThrow(new JWTError('No public key found'));
          expect(verifySpy).toHaveBeenCalledTimes(2);
          expect(client.openIdConfiguration).toHaveBeenCalledTimes(2);
          expect(client.jwks).toHaveBeenCalledTimes(1);
          expect(client.jwks).toHaveBeenLastCalledWith({ skipCache: true });

        });

        it('propagates unrelated errors thrown by `idToken.verifySignature`', async () => {
          const token = new Token(mockTokenResponse());

          const verifySpy = jest.spyOn(token.idToken!, 'verifySignature')
            .mockRejectedValueOnce(new JWTError('Random Error'))
            .mockRejectedValueOnce(new Error('Other Random Error'));

          await expect(client.validateToken({}, [], token)).rejects.toThrow(new JWTError('Random Error'));
          expect(verifySpy).toHaveBeenCalledTimes(1);
          expect(client.openIdConfiguration).toHaveBeenCalledTimes(1);
          expect(client.jwks).not.toHaveBeenCalled();

          await expect(client.validateToken({}, [], token)).rejects.toThrow(new Error('Other Random Error'));
          expect(verifySpy).toHaveBeenCalledTimes(2);
          expect(client.openIdConfiguration).toHaveBeenCalledTimes(2);
          expect(client.jwks).not.toHaveBeenCalled();
        });
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
        jest.spyOn(client, 'jwks').mockResolvedValue({ keys: [{ kid: 'foo', alg: 'bar'}]});
      });

      it('should send a request to /token', async () => {
        fetchSpy.mockResolvedValue(Response.json(mockTokenResponse()));

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
          client_id: 'fake',
          grant_type: 'refresh_token',
          scope: 'openid email profile',
          refresh_token: token.refreshToken!
        }).toString());
      });

      it('should throw if no refresh token exists', async () => {
        const token = new Token(mockTokenResponse('foo', { refreshToken: undefined }));
        const response = await client.performRefresh(token);
        expect(response).toEqual({ error: `Missing token: refreshToken` });
      });

      it('should handle downscoping a token', async () => {
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
            ...token.toJSON() as TokenInit,
            id: token.id,
            refreshToken: 'foobar'
          })
        });
        expect(newToken).not.toEqual(token);
        expect(newToken.scopes).toEqual(['openid']);
        expect(newToken.refreshToken).not.toEqual(token.refreshToken);
        expect(newToken.refreshToken).toEqual(undefined);
        expect(newToken.scopes).toEqual(newToken.context.scopes);
      });

      it('should handle downscoping a refresh token without scopes', async () => {
        jest.spyOn(client, 'validateToken').mockResolvedValue(undefined);

        const downscoped = new Token(mockTokenResponse(null, { refreshToken: 'foobar' }));
        jest.spyOn(client, 'sendTokenRequest').mockResolvedValue(downscoped);

        const willRefreshSpy = jest.fn();
        client.emitter.on('token_will_refresh', willRefreshSpy);
        const didRefreshSpy = jest.fn();
        client.emitter.on('token_did_refresh', didRefreshSpy);

        // mock scopes: openid email profile offline_access
        const token = new Token(mockTokenResponse());

        const newToken = await client.refresh(token, []);
        expect(willRefreshSpy).toHaveBeenCalledWith({ token });
        expect(didRefreshSpy).toHaveBeenCalledTimes(1);
        expect(didRefreshSpy).toHaveBeenCalledWith({
          token: new Token({
            ...token.toJSON() as TokenInit,
            id: token.id,
            refreshToken: 'foobar'
          })
        });
        expect(newToken).not.toEqual(token);
        expect(newToken.scope).toEqual('');
        expect(newToken.scopes).toEqual([]);
        expect(newToken.refreshToken).not.toEqual(token.refreshToken);
        expect(newToken.refreshToken).toEqual(undefined);
      });
    });

    describe('revoke', () => {
      it('should send a request to revoke a token', async () => {
        jest.spyOn(client, 'openIdConfiguration').mockResolvedValue({
          issuer: 'https://fake.okta.com',
          revocation_endpoint: 'https://fake.okta.com/revoke'
        });
        fetchSpy.mockResolvedValue(new Response());

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
        }).toString());

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
        }).toString());

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
        }).toString());

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
        }).toString());
      });

      it('should throw if an invalid token type is passed', async () => {
        const clientFetchSpy = jest.spyOn(client, 'fetch');
        const token = new Token(mockTokenResponse());
        await expect(client.revoke(token, 'FOO')).rejects.toThrow(
          new Error('Unrecognized Token Type: FOO')
        );
        expect(clientFetchSpy).not.toHaveBeenCalled();
      });

      it('should throw if a refresh token does not exist', async () => {
        const clientFetchSpy = jest.spyOn(client, 'fetch');
        const token = new Token(mockTokenResponse('foo', { refreshToken: undefined }));
        await expect(client.revoke(token, 'REFRESH')).rejects.toThrow(
          new TokenError('missing expected token (REFRESH)')
        );
        expect(clientFetchSpy).not.toHaveBeenCalled();
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

    describe('introspect', () => {
      it('should send a request to introspect a token', async () => {
        jest.spyOn(client, 'openIdConfiguration').mockResolvedValue({
          issuer: 'https://fake.okta.com',
          introspection_endpoint: 'https://fake.okta.com/introspect'
        });
        fetchSpy.mockResolvedValue(Response.json({ active: true }));

        const tokenResponse = mockTokenResponse();
        const token = new Token(tokenResponse);
        await client.introspect(token, 'access_token');

        expect(fetchSpy).toHaveBeenCalledTimes(1);
        expect(fetchSpy).toHaveBeenNthCalledWith(1, expect.any(Request));

        const call1 = fetchSpy.mock.lastCall[0];
        expect(call1.url).toEqual('https://fake.okta.com/introspect');
        expect(call1.method).toEqual('POST');
        expect(call1.headers).toEqual(new Headers({
          'authorization': basicAuthHeader,
          'X-Okta-User-Agent-Extended': 'fake-useragent',
          'content-type': 'application/x-www-form-urlencoded;charset=UTF-8'
        }));
        // request.text returns raw request body
        expect(await call1.text()).toEqual(new URLSearchParams({
          token_type_hint: 'access_token',
          token: token.accessToken
        }).toString());

        fetchSpy.mockReset();
        fetchSpy.mockResolvedValue(Response.json({ active: true }));
        await client.introspect(token, 'id_token');

        expect(fetchSpy).toHaveBeenCalledTimes(1);
        expect(fetchSpy).toHaveBeenNthCalledWith(1, expect.any(Request));

        const call2 = fetchSpy.mock.lastCall[0];
        expect(call2.url).toEqual('https://fake.okta.com/introspect');
        expect(call2.method).toEqual('POST');
        expect(call2.headers).toEqual(new Headers({
          'authorization': basicAuthHeader,
          'X-Okta-User-Agent-Extended': 'fake-useragent',
          'content-type': 'application/x-www-form-urlencoded;charset=UTF-8'
        }));
        // request.text returns raw request body
        expect(await call2.text()).toEqual(new URLSearchParams({
          token_type_hint: 'id_token',
          token: token.idToken!.rawValue
        }).toString());

        fetchSpy.mockReset();
        fetchSpy.mockResolvedValue(Response.json({ active: true }));
        await client.introspect(token, 'refresh_token');

        expect(fetchSpy).toHaveBeenCalledTimes(1);
        expect(fetchSpy).toHaveBeenNthCalledWith(1, expect.any(Request));

        const call3 = fetchSpy.mock.lastCall[0];
        expect(call3.url).toEqual('https://fake.okta.com/introspect');
        expect(call3.method).toEqual('POST');
        expect(call3.headers).toEqual(new Headers({
          'authorization': basicAuthHeader,
          'X-Okta-User-Agent-Extended': 'fake-useragent',
          'content-type': 'application/x-www-form-urlencoded;charset=UTF-8'
        }));
        // request.text returns raw request body
        expect(await call3.text()).toEqual(new URLSearchParams({
          token_type_hint: 'refresh_token',
          token: token.refreshToken!
        }).toString());
      });

      it('should propagate oauth2 errors', async () => {
        jest.spyOn(client, 'openIdConfiguration')
          .mockResolvedValueOnce({
            issuer: 'https://fake.okta.com',
            introspection_endpoint: 'https://fake.okta.com/introspect'
          })
          .mockResolvedValueOnce({
            issuer: 'https://fake.okta.com',
            introspection_endpoint: 'https://fake.okta.com/introspect'
          });
        fetchSpy.mockResolvedValue(Response.json({ error: 'some oauth error' }, { status: 400 }));
        const token = new Token(mockTokenResponse());
        await expect(client.introspect(token, 'access_token')).resolves.toEqual({ error: 'some oauth error' });
      });

      it('should throw if no `introspection_endpoint` exists', async () => {
        jest.spyOn(client, 'openIdConfiguration')
          .mockResolvedValueOnce({
            issuer: 'https://fake.okta.com',
            // introspection_endpoint: 'https://fake.okta.com/introspect'
          })
          .mockResolvedValue({
            issuer: 'https://fake.okta.com',
            introspection_endpoint: 'randomstring'
          });
        const token = new Token(mockTokenResponse());
        await expect(client.introspect(token, 'access_token')).rejects.toThrow(
          new OAuth2Error('missing `introspection_endpoint`')
        );
        await expect(client.introspect(token, 'id_token')).rejects.toThrow(
          new OAuth2Error('missing `introspection_endpoint`')
        );
        await expect(client.introspect(token, 'refresh_token')).rejects.toThrow(
          new OAuth2Error('missing `introspection_endpoint`')
        );
      });

    });

    describe('userInfo', () => {
      it('should send a request to /userinfo', async () => {
        jest.spyOn(client, 'openIdConfiguration').mockResolvedValue({
          issuer: 'https://fake.okta.com',
          userinfo_endpoint: 'https://fake.okta.com/userinfo'
        });
        fetchSpy.mockResolvedValue(Response.json({ name: 'foo bar', email: 'foo@bar' }));

        const tokenResponse = mockTokenResponse();
        const token = new Token(tokenResponse);
        await client.userInfo(token);

        expect(fetchSpy).toHaveBeenCalledTimes(1);
        expect(fetchSpy).toHaveBeenNthCalledWith(1, expect.any(Request));

        const call1 = fetchSpy.mock.lastCall[0];
        expect(call1.url).toEqual('https://fake.okta.com/userinfo');
        expect(call1.method).toEqual('POST');
        expect(call1.headers).toEqual(new Headers({
          'authorization': `${token.tokenType} ${token.accessToken}`,   // bearer token authorization
          'X-Okta-User-Agent-Extended': 'fake-useragent',
          'content-type': 'application/x-www-form-urlencoded;charset=UTF-8'
        }));
        expect(await call1.text()).toEqual('');   // no post body is sent with this request
      });

      it('should propagate oauth2 errors', async () => {
        jest.spyOn(client, 'openIdConfiguration')
          .mockResolvedValueOnce({
            issuer: 'https://fake.okta.com',
            userinfo_endpoint: 'https://fake.okta.com/userinfo'
          })
          .mockResolvedValueOnce({
            issuer: 'https://fake.okta.com',
            userinfo_endpoint: 'https://fake.okta.com/userinfo'
          });
        fetchSpy.mockResolvedValue(Response.json({ error: 'some oauth error' }, { status: 400 }));
        const token = new Token(mockTokenResponse());
        await expect(client.userInfo(token)).resolves.toEqual({ error: 'some oauth error' });
      });

      it('should throw if no `userinfo_endpoint` exists', async () => {
        jest.spyOn(client, 'openIdConfiguration')
          .mockResolvedValueOnce({
            issuer: 'https://fake.okta.com',
            // userinfo_endpoint: 'https://fake.okta.com/userinfo'
          })
          .mockResolvedValueOnce({
            issuer: 'https://fake.okta.com',
            userinfo_endpoint: 'randomstring'
          });
        const token = new Token(mockTokenResponse());
        await expect(client.userInfo(token)).rejects.toThrow(
          new OAuth2Error('missing `userinfo_endpoint`')
        );
      });
    });
  });
});
