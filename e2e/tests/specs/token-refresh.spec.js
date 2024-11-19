import RedirectModelApp from '../pageobjects/RedirectModelApp';
import OktaLogin from '@repo/e2e.helpers/pageobjects/OktaLogin';

process.env.ORG_OIE_ENABLED = true;

const USERNAME = process.env.USERNAME;
const PASSWORD = process.env.PASSWORD;

const performSignIn = async () => {
  await OktaLogin.waitForLoad();
  await OktaLogin.signin(USERNAME, PASSWORD);
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

describe('Token Refresh', () => {
  afterEach(async () => {
    await browser.reloadSession();
  });

  describe('Multi tab', () => {
    const open = async (path = '/', openInNewWindow = false) => {
      if (openInNewWindow) {
        await browser.newWindow(path, { windowFeatures: 'noopener=yes' });
      }
      else {
        await browser.url(path);
      }
      await RedirectModelApp.waitForLoad();
      return await browser.getWindowHandle();
    }
  
    it('can complete token refresh when tab performing refresh closes prematurely', async () => {
      // perform standard redirect oidc flow
      const tab1 = await open('/');
      await assertFreshPage();
      await RedirectModelApp.withTagLink.click();
      await performSignIn();
      await assertSecuredPage();

      const accessToken = await RedirectModelApp.accessToken.getText();

      // open additional tabs (which can access the protected page because the token is in storage)
      const tab2 = await open('/', true);
      await RedirectModelApp.withTagLink.click();
      await assertSecuredPage();    // assertions are always done on the "active" browser context, per wdio
      const tab3 = await open('/', true);
      await RedirectModelApp.withTagLink.click();
      await assertSecuredPage();

      // Trigger token refresh
      await RedirectModelApp.refreshBtn.click();    // tab 3
      await browser.pause(100);   // short pause to ensure tab 3 gets the refresh lock
      await browser.switchToWindow(tab2);
      await RedirectModelApp.refreshBtn.click();    // tab 2
      await browser.switchToWindow(tab1);
      await RedirectModelApp.refreshBtn.click();    // tab 1

      // close tab 3 (the tab performing refresh)
      await browser.switchToWindow(tab3);
      await browser.closeWindow();

      await browser.switchToWindow(tab1);
      await browser.waitUntil(async () => {
        const refreshedToken = await RedirectModelApp.accessToken.getText();
        return refreshedToken !== accessToken;
      }, { timeout: 10000, timeoutMsg: 'wait for refreshed token to update'});

      await browser.switchToWindow(tab1);
      const tab1Token = await RedirectModelApp.accessToken.getText();
      await browser.switchToWindow(tab2);
      const tab2Token = await RedirectModelApp.accessToken.getText();

      expect(tab1Token).toBeDefined();
      expect(tab2Token).toBeDefined();
      expect(tab1Token).not.toEqual(accessToken);
      expect(tab1Token).toEqual(tab2Token);
    });
  });

});
