import { ConfigurationParams } from 'src/types';
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
      baseURL: 'https://foo.com/',
      clientId: 'fakeclientid',
      scopes: 'openid email profile',
      discoveryURL: 'https://foo.com/.well-known/openid-configuration',
      authentication: 'none'
    });

    const deserialized = new OAuth2Client.Configuration(json as ConfigurationParams);
    expect(deserialized).toBeInstanceOf(OAuth2Client.Configuration);
    expect(deserialized).toMatchObject({
      baseURL: expect.any(URL),
      clientId: 'fakeclientid',
      scopes: 'openid email profile',
      discoveryURL: expect.any(URL),
      authentication: 'none'
    });
    expect(deserialized.baseURL.href).toEqual('https://foo.com/');
    expect(deserialized.discoveryURL.href).toEqual('https://foo.com/.well-known/openid-configuration');
  });
});
