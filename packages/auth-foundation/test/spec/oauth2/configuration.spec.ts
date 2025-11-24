import { ConfigurationParams } from 'src/types';
import { APIClient } from 'src/http';
import { OAuth2Client } from 'src/oauth2/client';

describe('OAuth2Client.Configuration', () => {
  it('should construct', () => {
    const conf = new OAuth2Client.Configuration({
      baseURL: 'https://foo.com',
      clientId: 'fakeclientid',
      scopes: 'openid email profile'
    });
    expect(conf).toBeInstanceOf(OAuth2Client.Configuration);
  });

  it('should compare oauth2 params against the set configuration', () => {
    const conf = new OAuth2Client.Configuration({
      baseURL: 'https://foo.com',
      clientId: 'fakeclientid',
      scopes: 'openid email profile'
    });

    expect(conf.matches({})).toBe(false);
    expect(conf.matches({ clientId: 'foo' })).toBe(false);
    expect(conf.matches({ scopes: ['openid'] })).toBe(false);
    expect(conf.matches({ issuer: new URL('https://foo.com') })).toBe(true);
    expect(conf.matches({ scopes: ['openid', 'email', 'profile', 'openid', 'email', 'profile'] })).toBe(true);
    expect(conf.matches({
      issuer: 'https://foo.com',
      clientId: 'fakeclientid',
      scopes: ['openid', 'email', 'profile']
    })).toBe(true);
  });

  it('should be able to serialize and de-serialize an instance', () => {
    const conf = new OAuth2Client.Configuration({
      baseURL: 'https://foo.com',
      clientId: 'fakeclientid',
      scopes: 'openid email profile'
    });
    expect(conf).toBeInstanceOf(OAuth2Client.Configuration);

    const json = conf.toJSON();
    expect(json.constructor).toBe(Object);
    expect(json).toMatchObject({
      issuer: 'https://foo.com/',
      clientId: 'fakeclientid',
      scopes: 'openid email profile',
      discoveryURL: 'https://foo.com/.well-known/openid-configuration',
      authentication: 'none'
    });

    const deserialized = new OAuth2Client.Configuration(json as ConfigurationParams);
    expect(deserialized).toBeInstanceOf(OAuth2Client.Configuration);
    expect(deserialized).toMatchObject({
      issuer: expect.any(URL),
      clientId: 'fakeclientid',
      scopes: 'openid email profile',
      discoveryURL: expect.any(URL),
      authentication: 'none'
    });
    expect(deserialized.issuer.href).toEqual('https://foo.com/');
    expect(deserialized.discoveryURL.href).toEqual('https://foo.com/.well-known/openid-configuration');
  });

  it('should be able to change default configuration values via `static DefaultOptions`', () => {
    const c1 = new OAuth2Client.Configuration({
      baseURL: 'https://foo.com',
      clientId: 'fakeclientid',
      scopes: 'openid email profile'
    });
    expect(c1.issuer.href).toEqual('https://foo.com/');
    expect(c1.authentication).toEqual('none');
    expect(c1.allowHTTP).toEqual(false);
    expect(c1.dpop).toEqual(false);
    expect(c1.fetchImpl).toEqual(undefined);

    // override default configurations
    OAuth2Client.Configuration.DefaultOptions.allowHTTP = true;
    OAuth2Client.Configuration.DefaultOptions.dpop = true;

    const c2 = new OAuth2Client.Configuration({
      baseURL: 'https://foo.com',
      clientId: 'fakeclientid',
      scopes: 'openid email profile'
    });
    expect(c2.issuer.href).toEqual('https://foo.com/');
    expect(c2.authentication).toEqual('none');
    expect(c2.allowHTTP).toEqual(true);
    expect(c2.dpop).toEqual(true);
    expect(c2.fetchImpl).toEqual(undefined);

    // ensure explicitly setting configuration takes precedence
    const c4 = new OAuth2Client.Configuration({
      baseURL: 'https://foo.com',
      clientId: 'fakeclientid',
      scopes: 'openid email profile',
      dpop: false,
      allowHTTP: false
    });
    expect(c4.issuer.href).toEqual('https://foo.com/');
    expect(c4.authentication).toEqual('none');
    expect(c4.allowHTTP).toEqual(false);
    expect(c4.dpop).toEqual(false);
    expect(c4.fetchImpl).toEqual(undefined);
  });
});
