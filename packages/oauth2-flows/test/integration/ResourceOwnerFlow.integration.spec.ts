import { OAuth2Error } from '@okta/auth-foundation';
import { ResourceOwnerFlow } from 'src/ResourceOwnerFlow';


/**
 * Exercises `ResourceOwnerFlow` against a real Authorization Server.
 *
 * Requires `ISSUER`, `NATIVE_CLIENT_ID`, `USERNAME`, `PASSWORD` env vars to be set.
 *
 * auto-integrates with `testenv` via jest setup file
 */
const { ISSUER, NATIVE_CLIENT_ID, USERNAME, PASSWORD } = process.env;


describe('ResourceOwnerFlow (integration)', () => {
  const flow = new ResourceOwnerFlow({
    issuer: ISSUER!,
    clientId: NATIVE_CLIENT_ID!,
    scopes: 'openid profile offline_access',
  });

  it('exchanges valid credentials for tokens', async () => {
    const token = await flow.start(USERNAME!, PASSWORD!);

    expect(token.accessToken).toBeTruthy();
    expect(token.idToken).toBeTruthy();
    expect(token.tokenType).toEqual('Bearer');
  });

  it('rejects invalid credentials with `invalid_grant`', async () => {
    let error: unknown;
    try {
      await flow.start(USERNAME!, `not-the-real-password-${Date.now()}`);
      throw new Error('expected `flow.start` to reject');
    }
    catch (err) {
      error = err;
    }

    expect(error).toBeInstanceOf(OAuth2Error);
    expect((error as OAuth2Error).error).toEqual('invalid_grant');
  });
});
