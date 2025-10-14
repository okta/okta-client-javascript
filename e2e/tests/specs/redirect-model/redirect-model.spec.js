import RedirectModelApp from '../../pageobjects/RedirectModelApp';
import OktaLogin from '@repo/e2e.helpers/pageobjects/OktaLogin';
import { waitForRequest } from '../../utils';

process.env.ORG_OIE_ENABLED = true;

const USERNAME = process.env.USERNAME;
const PASSWORD = process.env.PASSWORD;

// request spies
let introspectEndpoint;
let userinfoEndpoint;


const performOktaSignIn = async () => {
  await OktaLogin.waitForLoad();
  await OktaLogin.signin(USERNAME, PASSWORD);
  await RedirectModelApp.waitForLoad();
};

const performRefresh = async () => {
  await RedirectModelApp.waitForProtectedPage();
  await RedirectModelApp.refreshBtn.click();
  await RedirectModelApp.waitForProtectedPage();
};

const performRevoke = async () => {
  await RedirectModelApp.waitForProtectedPage();
  await RedirectModelApp.revokeBtn.click();
  await RedirectModelApp.waitForLoad();
};

const performIntrospection = async () => {
  await RedirectModelApp.waitForProtectedPage();
  await RedirectModelApp.accessToken.click();
  await RedirectModelApp.idToken.click();
  await RedirectModelApp.refreshToken.click();
  await waitForRequest(introspectEndpoint);
  await RedirectModelApp.waitForLoad();
};

const performUserInfo = async () => {
  await RedirectModelApp.waitForProtectedPage();
  await RedirectModelApp.userinfoBtn.click();
  await waitForRequest(userinfoEndpoint);
  await RedirectModelApp.waitForLoad();
};

const assertFreshPage = async () => {
  await expect(browser).toHaveUrlContaining('http://localhost:8080/');
  await expect(RedirectModelApp.credentialSize).toHaveText('0');
  await expect(RedirectModelApp.credentialDefault).toHaveText('null');
};

const assertSecuredPage = async () => {
  await RedirectModelApp.waitForProtectedPage();
  await expect(browser).toHaveUrlContaining('http://localhost:8080/secured');
  const accessToken = await RedirectModelApp.accessToken.getText();
  expect(accessToken).toBeDefined();
};

const assertTokenRefresh = async () => {
  const accessToken = await RedirectModelApp.accessToken.getText();
  await performRefresh();
  await browser.waitUntil(async () => {
    const refreshedToken = await RedirectModelApp.accessToken.getText();
    return refreshedToken !== accessToken;
  }, { timeout: 10000, timeoutMsg: 'wait for refreshed token to update'});
  const refreshedToken = await RedirectModelApp.accessToken.getText();
  expect(refreshedToken).toBeDefined();
  expect(refreshedToken).not.toEqual(accessToken);
};

const assertTokenRevoke = async () => {
  await performRevoke();
  await assertFreshPage();
};

const assertTokenIntrospection = async () => {
  expect(introspectEndpoint.calls.length).toEqual(0);
  await performIntrospection();
  expect(introspectEndpoint.calls.length).toEqual(3);
  expect(introspectEndpoint.calls[0].statusCode).toEqual(200);
  expect(introspectEndpoint.calls[1].statusCode).toEqual(200);
  expect(introspectEndpoint.calls[2].statusCode).toEqual(200);
};

const assertUserInfo = async () => {
  expect(userinfoEndpoint.calls.length).toEqual(0);
  await performUserInfo();
  expect(userinfoEndpoint.calls.length).toEqual(1);
  expect(userinfoEndpoint.calls[0].statusCode).toEqual(200);
};

const assertTokenActions = async () => {
  await assertTokenIntrospection();
  await assertTokenRefresh();
  await assertUserInfo();
  await assertTokenRevoke();    // note: revoke test must be last
};

describe('Redirect Model App', () => {
  beforeEach(async () => {
    introspectEndpoint = await browser.mock(`${new URL(process.env.ISSUER).origin}/**/oauth2/v1/introspect`, { method: 'post' });
    userinfoEndpoint = await browser.mock(`${new URL(process.env.ISSUER).origin}/**/oauth2/v1/userinfo`, { method: 'post' });
  });

  afterEach(async () => {
    await browser.reloadSession();
  });

  describe('with OIDC', () => {
    const bootstrap = async () => {
      return RedirectModelApp.open();
    };
  
    it('can login and store tokens', async () => {
      await bootstrap();
      await assertFreshPage();
      await RedirectModelApp.signIn();
      await performOktaSignIn();
      await expect(RedirectModelApp.credentialSize).toHaveText('1');
      const credentialDefault = await RedirectModelApp.credentialDefault.getText();
      expect(credentialDefault).toBeDefined();
      expect(credentialDefault).not.toEqual('null');
    });
  
    it('can store and retrieve default credential', async () => {
      await bootstrap();
      await assertFreshPage();
      await RedirectModelApp.withDefaultLink.click();
      await performOktaSignIn();
      await assertSecuredPage();
      await assertTokenActions();
    });
  
    it('can store and retrieve tokens by tag', async () => {
      await bootstrap();
      await assertFreshPage();
      await RedirectModelApp.withTagLink.click();
      await performOktaSignIn();
      await assertSecuredPage();
      await assertTokenActions();
    });
  
    xit('can store and retrieve tokens by findCredential', async () => {
      await bootstrap();
      await assertFreshPage();
      await RedirectModelApp.findCredentialLink.click();
      await performOktaSignIn();
      await assertSecuredPage();
      await assertTokenActions();
    });

    it('can perform logout', async () => {
      await bootstrap();
      await assertFreshPage();
      await RedirectModelApp.signIn();
      await performOktaSignIn();
      await expect(RedirectModelApp.credentialSize).toHaveText('1');
      await RedirectModelApp.signOutBtn.click();
      await RedirectModelApp.waitForLoad();
      await assertFreshPage();
      await expect(RedirectModelApp.credentialSize).toHaveText('0');
    });
  });

  describe('without OIDC', () => {
    const bootstrap = async () => {
      return RedirectModelApp.open(false);
    };
  
    it('can login and store tokens', async () => {
      await bootstrap();
      await assertFreshPage();
      await RedirectModelApp.signIn();
      await performOktaSignIn();
      await expect(RedirectModelApp.credentialSize).toHaveText('1');
      const credentialDefault = await RedirectModelApp.credentialDefault.getText();
      expect(credentialDefault).toBeDefined();
      expect(credentialDefault).not.toEqual('null');
    });
  
    it('can store and retrieve default credential', async () => {
      await bootstrap();
      await assertFreshPage();
      await RedirectModelApp.withDefaultLink.click();
      await performOktaSignIn();
      await assertSecuredPage();
      // await assertTokenActions();
    });
  
    it('can store and retrieve tokens by tag', async () => {
      await bootstrap();
      await assertFreshPage();
      await RedirectModelApp.withTagLink.click();
      await performOktaSignIn();
      await assertSecuredPage();
      // await assertTokenActions();
    });
  
    xit('can store and retrieve tokens by findCredential', async () => {
      await bootstrap();
      await assertFreshPage();
      await RedirectModelApp.findCredentialLink.click();
      await performOktaSignIn();
      await assertSecuredPage();
      // await assertTokenActions();
    });
  });
});
