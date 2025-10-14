import { WWWAuth } from 'src/http';


describe('WWWAuth', () => {
  describe('.parse', () => {
    it('should accept Headers and Response instances as input', () => {
      const wwwAuthString = 'scheme foo1="hello1", bar1="bye1", foo2="hello2", bar2="bye2", foo3="hello3", bar3="bye3", foo_bar="test"';
      const headers = new Headers();
      headers.set('www-authenticate', wwwAuthString);
      const response = Response.json({}, { headers });

      expect(WWWAuth.parse(wwwAuthString)).toEqual(WWWAuth.parse(headers));
      expect(WWWAuth.parse(wwwAuthString)).toEqual(WWWAuth.parse(response));
      expect(WWWAuth.parse(headers)).toEqual(WWWAuth.parse(response));
    });

    it('should return null if header is empty string', () => {
      const headers = new Headers();
      headers.set('www-authenticate', '');
      const response = Response.json({}, { headers });
      expect(WWWAuth.parse('')).toEqual(null);
      expect(WWWAuth.parse(headers)).toEqual(null);
      expect(WWWAuth.parse(response)).toEqual(null);
    });


    /* eslint max-statements: [2, 45] */
    it('should parse www-authenicate headers', () => {
      const t0 = WWWAuth.parse(
        'scheme foo1="hello1", bar1="bye1", foo2="hello2", bar2="bye2", foo3="hello3", bar3="bye3", foo_bar="test"'
      )!;
      expect(t0.scheme).toEqual('scheme');
      expect(t0).toMatchObject({
        scheme: 'scheme',
        foo1: 'hello1',
        bar1: 'bye1',
        foo2: 'hello2',
        bar2: 'bye2',
        foo3: 'hello3',
        bar3: 'bye3',
        foo_bar: 'test'
      });

      // userInfo error
      const t1 = WWWAuth.parse(
        'Bearer error="insufficient_scope", error_description="The access token must provide access to at least one of these scopes - profile, email, address or phone"'
      )!;
      expect(WWWAuth.isWWWAuthenticateError(t1)).toBeTruthy();
      expect(t1.scheme).toEqual('Bearer');
      expect(t1.error).toEqual('insufficient_scope');
      expect(t1.errorDescription).toEqual('The access token must provide access to at least one of these scopes - profile, email, address or phone');
      expect(t1).toMatchObject({
        error: 'insufficient_scope',
        error_description: 'The access token must provide access to at least one of these scopes - profile, email, address or phone'
      });

      // userInfo error
      const t2 = WWWAuth.parse(
        'Bearer error="invalid_token", error_description="The access token is invalid"'
      )!;
      expect(WWWAuth.isWWWAuthenticateError(t2)).toBeTruthy();
      expect(t2.scheme).toEqual('Bearer');
      expect(t2.error).toEqual('invalid_token');
      expect(t2.errorDescription).toEqual('The access token is invalid');
      expect(t2).toMatchObject({
        error: 'invalid_token',
        error_description: 'The access token is invalid'
      });

      // DPoP error (userInfo endpoint)
      const t3 = WWWAuth.parse(
        `DPoP algs="RS256 RS384 RS512 ES256 ES384 ES512", authorization_uri="http://myokta.okta.com/oauth2/v1/authorize", realm="http://myokta.okta.com", scope="openid", error="invalid_dpop_proof", error_description="'ath' claim in the DPoP proof does not match the presented access_token.", resource="/oauth2/v1/userinfo"`
      )!;
      expect(WWWAuth.isWWWAuthenticateError(t3)).toBeTruthy();
      expect(t3.scheme).toEqual('DPoP');
      expect(t3.realm).toEqual('http://myokta.okta.com');
      expect(t3.error).toEqual('invalid_dpop_proof');
      expect(t3.errorDescription).toEqual(`'ath' claim in the DPoP proof does not match the presented access_token.`);
      expect(t3).toMatchObject({
        error: 'invalid_dpop_proof',
        error_description: `'ath' claim in the DPoP proof does not match the presented access_token.`,
        algs: 'RS256 RS384 RS512 ES256 ES384 ES512',
        scope: 'openid',
        authorization_uri: 'http://myokta.okta.com/oauth2/v1/authorize',
        realm: 'http://myokta.okta.com',
        resource: '/oauth2/v1/userinfo'
      });

      // DPoP nonce error
      const t4 = WWWAuth.parse(
        'DPoP error="use_dpop_nonce", error_description="Resource server requires nonce in DPoP proof"'
      )!;
      expect(WWWAuth.isWWWAuthenticateError(t4)).toBeTruthy();
      expect(t4.scheme).toEqual('DPoP');
      expect(t4.realm).toEqual(undefined);
      expect(t4.error).toEqual('use_dpop_nonce');
      expect(t4.errorDescription).toEqual(`Resource server requires nonce in DPoP proof`);
      expect(t4).toMatchObject({
        error: 'use_dpop_nonce',
        error_description: `Resource server requires nonce in DPoP proof`,
      });

      // MyAccount error
      const t5 = WWWAuth.parse(
        'Bearer realm="IdpMyAccountAPI", error="insufficient_authentication_context", error_description="The access token requires additional assurance to access the resource", max_age=900, acr_values="urn:okta:loa:2fa:any:ifpossible"'
      )!;
      expect(WWWAuth.isWWWAuthenticateError(t5)).toBeTruthy();
      expect(t5.scheme).toEqual('Bearer');
      expect(t5.realm).toEqual('IdpMyAccountAPI');
      expect(t5.error).toEqual('insufficient_authentication_context');
      expect(t5.errorDescription).toEqual(`The access token requires additional assurance to access the resource`);
      expect(t5).toMatchObject({
        error: 'insufficient_authentication_context',
        error_description: `The access token requires additional assurance to access the resource`,
        realm: 'IdpMyAccountAPI',
        max_age: '900',
        acr_values: 'urn:okta:loa:2fa:any:ifpossible'
      });

      const t6 = WWWAuth.parse(
        'Bearer realm="IdpMyAccountAPI", error="insufficient_authentication_context", error_description="The access token requires additional assurance to access the resource", acr_values=urn:okta:loa:2fa:any:ifpossible, max_age=0'
      )!;
      expect(WWWAuth.isWWWAuthenticateError(t6)).toBeTruthy();
      expect(t6.scheme).toEqual('Bearer');
      expect(t6.realm).toEqual('IdpMyAccountAPI');
      expect(t6.error).toEqual('insufficient_authentication_context');
      expect(t6.errorDescription).toEqual(`The access token requires additional assurance to access the resource`);
      expect(t6).toMatchObject({
        error: 'insufficient_authentication_context',
        error_description: `The access token requires additional assurance to access the resource`,
        realm: 'IdpMyAccountAPI',
        max_age: '0',
        acr_values: 'urn:okta:loa:2fa:any:ifpossible'
      });
    });

    // WWW-Authenticate: DPoP error="use_dpop_nonce", error_description="Resource server requires nonce in DPoP proof"

  });
});
