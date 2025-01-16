import RedirectModelApp from '../../pageobjects/RedirectModelApp';
import OktaLogin from '@repo/e2e.helpers/pageobjects/OktaLogin';


process.env.ORG_OIE_ENABLED = true;

const USERNAME = process.env.USERNAME;
const PASSWORD = process.env.PASSWORD;


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
  await RedirectModelApp.refreshBtn.click();
  await browser.waitUntil(async () => {
    const refreshedToken = await RedirectModelApp.accessToken.getText();
    return refreshedToken !== accessToken;
  }, { timeout: 10000, timeoutMsg: 'wait for refreshed token to update'});
  const refreshedToken = await RedirectModelApp.accessToken.getText();
  expect(refreshedToken).toBeDefined();
  expect(refreshedToken).not.toEqual(accessToken);
};

const assertAllTabs = async (tabs, assertion) => {
  for (const tab of tabs) {
    await browser.switchToWindow(tab);
    await assertion();
  }
  await browser.switchToWindow(tabs[0]);    // always return to first tab
};

const expectSameValue = (array) => {
  expect(array.every(val => val === array[0]));
};

const assertTokenValues = async (tabs) => {
  const tokens = [];
  await assertAllTabs(tabs, async () => {
    const accessToken = await RedirectModelApp.accessToken.getText();
    expect(accessToken).toBeDefined();
    tokens.push(accessToken);
  });
  expectSameValue(tokens);
  return tokens;
};

const performSignIn = async (shouldBounceRedirect = false) => {
  if (!shouldBounceRedirect) {
    await OktaLogin.waitForLoad();
    await OktaLogin.signin(USERNAME, PASSWORD);
  }
  await RedirectModelApp.waitForLoad();
};

const bootstrap = async (path = '/') => {
  await browser.url(path);
  await RedirectModelApp.waitForLoad();
  const tab1 = await browser.getWindowHandle();
  await browser.newWindow(path, { windowFeatures: 'noopener=yes' });
  await RedirectModelApp.waitForLoad();
  const tab2 = await browser.getWindowHandle();
  await browser.switchToWindow(tab1);
  return [tab1, tab2];
};

describe('Cross Tab Sync' , () => {
  afterEach(async () => {
    await browser.reloadSession();
  });

  it('can sync added Credentials across tabs', async () => {
    // load multiple tabs
    const tabs = await bootstrap();
    await assertAllTabs(tabs, assertFreshPage);

    // request a token
    await RedirectModelApp.signInBtn.click();
    await performSignIn();
    await assertAllTabs(tabs, async () => {
      await expect(RedirectModelApp.credentialSize).toHaveText('1');
    });

    // assert all tabs know of the new token
    const tokens = [];
    await assertAllTabs(tabs, async () => {
      await RedirectModelApp.selectFirstCredential.click();
      const accessToken = await RedirectModelApp.accessToken.getText();
      expect(accessToken).toBeDefined();
      tokens.push(accessToken);
    });
    expectSameValue(tokens);
  });

  it('can sync the removal of a Credential', async () => {
    // load multiple tabs
    const tabs = await bootstrap();
    await assertAllTabs(tabs, assertFreshPage);

    // request a token
    await RedirectModelApp.signInBtn.click();
    await performSignIn();
    await assertAllTabs(tabs, async () => {
      await expect(RedirectModelApp.credentialSize).toHaveText('1');
    });

    // delete the token
    await RedirectModelApp.selectFirstCredential.click();
    await RedirectModelApp.deleteBtn.click();

    // assert all pages are on a fresh unauthenticated screen
    await assertAllTabs(tabs, async () => {
      await assertFreshPage();
      // asserts default was updated as well
      await expect(RedirectModelApp.credentialDefault).toHaveText('null');
    });
  });

  it('can sync Credential.default after adding', async () => {
    // load multiple tabs
    const tabs = await bootstrap();
    await assertAllTabs(tabs, assertFreshPage);

    // request 2 tokens
    await RedirectModelApp.signInBtn.click();
    await performSignIn();
    await RedirectModelApp.signInBtn.click();
    await performSignIn(true);
    await assertAllTabs(tabs, async () => {
      await expect(RedirectModelApp.credentialSize).toHaveText('2');
    });

    // delete the default token (via Credential.default)
    await RedirectModelApp.credentialDefault.click();
    await RedirectModelApp.deleteBtn.click();
    await assertAllTabs(tabs, async () => {
      await expect(RedirectModelApp.credentialDefault).toHaveText('null');
    });
    const leftoverToken = await RedirectModelApp.selectFirstCredential.getText();

    // TODO: should a new token be assigned to default in this situation?
    // request another token, expecting it to be assigned as the new default
    await RedirectModelApp.signInBtn.click();
    await performSignIn(true);

    // assert all tabs know of the new default
    // const defaultId = await browser.execute('return window.Credential.default.id');
    // expect(defaultId).not.toEqual(null);
    // await assertAllTabs(tabs, async () => {
    //   await expect(RedirectModelApp.credentialDefault).toHaveText(defaultId);
    // });

   // changes the default value manually (without removal)
    await RedirectModelApp.getCredLinkById(leftoverToken).click();
    await RedirectModelApp.setDefaultBtn.click();

    // assert all tabs know of the new default
    const newDefaultId = await browser.execute('return window.Credential.default.id');
    expect(newDefaultId).not.toEqual(null);
    // expect(newDefaultId).not.toEqual(defaultId);
    await assertAllTabs(tabs, async () => {
      await expect(RedirectModelApp.credentialDefault).toHaveText(newDefaultId);
    });
  });

  it('can sync Credential refreshes', async () => {
    // load multiple tabs
    const tabs = await bootstrap();
    await assertAllTabs(tabs, assertFreshPage);

    // request a token
    await RedirectModelApp.signInBtn.click();
    await performSignIn();

    await assertAllTabs(tabs, async () => {
      await expect(RedirectModelApp.credentialSize).toHaveText('1');

      // navigate app to secure page
      await RedirectModelApp.withDefaultLink.click();
      await assertSecuredPage();
    });

    // store first value of access token
    const t1 = (await assertTokenValues(tabs))[0];

    // refresh the token
    await assertTokenRefresh();

    // store second value of access token
    const t2 = (await assertTokenValues(tabs))[0];

    // t1 and t2 shouldn't be the same value, if refresh succeed
    expect(t2).not.toEqual(t1);
  });

  it('can complete token refresh when tab performing refresh closes prematurely', async () => {
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

// https://webdriver.io/docs/retry/#rerun-single-tests-in-jasmine-or-mocha
}, jasmine.DEFAULT_TIMEOUT_INTERVAL, 2);
