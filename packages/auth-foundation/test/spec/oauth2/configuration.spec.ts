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

  it('should encode instance to string', () => {
    const conf = new OAuth2Client.Configuration({
      baseURL: 'https://foo.com',
      clientId: 'fakeclientid',
      scopes: 'openid email profile'
    });
    const s1 = conf.encode();
    expect(s1).toEqual(`{"baseURL":"https://foo.com/","discoveryURL":"https://foo.com/.well-known/openid-configuration","clientId":"fakeclientid","scopes":"openid email profile","authentication":"none","dpop":false}`);
  });

  it('should decode instance from a string', () => {
    const str = `{"baseURL":"https://foo.com/","discoveryURL":"https://foo.com/.well-known/openid-configuration","clientId":"fakeclientid","scopes":"openid email profile","authentication":"none"}`;
    const conf = OAuth2Client.Configuration.decode<OAuth2Client.Configuration>(str);
    expect(conf).toBeInstanceOf(OAuth2Client.Configuration);
    expect(conf).toMatchObject({
      baseURL: expect.any(URL),
      clientId: 'fakeclientid',
      scopes: 'openid email profile',
      discoveryURL: expect.any(URL),
      authentication: 'none'
    });
    expect(conf.baseURL.href).toEqual('https://foo.com/');
    expect(conf.discoveryURL.href).toEqual('https://foo.com/.well-known/openid-configuration');
  });
});
