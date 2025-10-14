import OktaLogin from '@repo/e2e.helpers/pageobjects/OktaLogin';


process.env.ORG_OIE_ENABLED = true;

const USERNAME = process.env.USERNAME;
const PASSWORD = process.env.PASSWORD;

const performOktaSignIn = async () => {
  await OktaLogin.waitForLoad();
  await OktaLogin.signin(USERNAME, PASSWORD);
  await browser.waitUntil(async () => {
    const url = await browser.getUrl();
    return url.includes('http://localhost:8080');
  });
};

const assertFreshPage = async () => {
  await expect(browser).toHaveUrlContaining('http://localhost:8080/');
  await expect($('h1')).toHaveText('NodeJS OIDC Test App');
};

const assertSecuredPage = async () => {
  await expect(browser).toHaveUrlContaining('http://localhost:8080/app');
  await expect($('h1')).toHaveText('Success!');
};

describe('Express OIDC App', () => {
  afterEach(async () => {
    await browser.reloadSession();
  });

  describe('Redirect (BFF)', () => {  
    it('can sign in and out', async () => {
      await browser.url('/');
      await assertFreshPage();
      await browser.url('/app');
      await performOktaSignIn();
      await assertSecuredPage();
      // login was successful

      await browser.url('/');
      await assertFreshPage();
      await browser.url('/app');
      await assertSecuredPage();
      // toggles between pages, re-auth not required

      await browser.url('/logout');
      await assertFreshPage();
      // logout was successful

      await browser.url('/app');
      await OktaLogin.waitForLoad();
      await expect(browser).toHaveUrlContaining(process.env.ISSUER);
      // confirms auth is required (due to logout)
    });
  });
});
