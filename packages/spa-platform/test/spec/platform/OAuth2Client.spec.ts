import { OAuth2Client } from 'src/platform';


// TODO: write some more tests
describe('OAuth2Client', () => {
  const params = {
    baseURL: 'https://fake.okta.com',
    clientId: 'fake',
    scopes: 'openid email profile',
  };

  it('can construct', () => {
    const config = new OAuth2Client.Configuration(params);

    const client1 = new OAuth2Client(config);
    expect(client1).toBeInstanceOf(OAuth2Client);
    const client2 = new OAuth2Client(params);
    expect(client2).toBeInstanceOf(OAuth2Client);
  });
});
