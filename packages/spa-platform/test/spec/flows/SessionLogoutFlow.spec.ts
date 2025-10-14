import { SessionLogoutFlow as Base } from '@okta/oauth2-flows';
import { SessionLogoutFlow } from 'src/flows';
import { oauthClient, makeTestToken } from '../../helpers/makeTestResource';


const params = {
  logoutRedirectUri: 'http://localhost:8080/logout/callback'
};

describe('SessionLogoutFlow', () => {
  let testContext: any = {};

  it('constructs', async () => {
    const flow = new SessionLogoutFlow(oauthClient, params);
    expect(flow).toBeInstanceOf(SessionLogoutFlow);
    expect(flow).toBeInstanceOf(Base);
  });

  beforeEach(() => {
    jest.spyOn(oauthClient, 'openIdConfiguration').mockResolvedValue({
      issuer: 'http://localhost:8080/',
      authorization_endpoint: 'http://localhost:8080/oauth2/authorize',
      token_endpoint: 'http://localhost:8080/oauth2/token'
    });
  });

});