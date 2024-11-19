import RedirectModelApp from '../pageobjects/RedirectModelApp';
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

const performSignIn = async (shouldBounceRedirect = false) => {
  if (!shouldBounceRedirect) {
    await OktaLogin.waitForLoad();
    await OktaLogin.signin(USERNAME, PASSWORD);
  }
  await RedirectModelApp.waitForLoad();
};

describe('Iframe Sync' , () => {
  const bootstrap = async () => {
    await browser.url('/iframe');
    await RedirectModelApp.waitForLoad();
  };
  
  const assertBothFrames = async (assertion) => {
    await browser.switchToParentFrame();
    await assertion();
    await browser.switchToFrame(await findIFrame());
    await assertion();
    await browser.switchToParentFrame();
  };

  const expectSameValue = (array) => {
    expect(array.every(val => val === array[0]));
  };

  const assertTokenValues = async () => {
    await browser.switchToParentFrame();
    const parent = await RedirectModelApp.accessToken.getText();
    expect(parent).toBeDefined();

    await browser.switchToFrame(await findIFrame());
    const iframe = await RedirectModelApp.accessToken.getText();
    expect(iframe).toBeDefined();

    // compares token values between parent and iframe
    expect(parent).toEqual(iframe);

    return parent;    // returns token value (string)
  };

  const findIFrame = async () => {
    return browser.findElement('css selector', 'iframe');
  };

  beforeEach(async () => {
    await bootstrap();
    await assertBothFrames(assertFreshPage);

    // request a token from parent
    await RedirectModelApp.signInBtn.click();
    await performSignIn();
    await assertBothFrames(async () => {
      await expect(RedirectModelApp.credentialSize).toHaveText('1');
    });
  });

  afterEach(async () => {
    await browser.reloadSession();
  });

  it('can sync added Credentials between parent and iframe', async () => {
    // beforeEach(): request a token from parent

    // assert all tabs know of the new token
    const tokens = [];
    await assertBothFrames(async () => {
      await RedirectModelApp.selectFirstCredential.click();
      const accessToken = await RedirectModelApp.accessToken.getText();
      expect(accessToken).toBeDefined();
      tokens.push(accessToken);
    });
    expectSameValue(tokens);

    // request a token from iframe
    await browser.switchToFrame(await findIFrame());
    await RedirectModelApp.signInBtn.click();
    await performSignIn(true);
    await assertBothFrames(async () => {
      await expect(RedirectModelApp.credentialSize).toHaveText('2');
    });
  });

  it('can sync the removal of a Credential between parent and iframe', async () => {
    const removeToken = async () => {
      // delete the token
      await RedirectModelApp.selectFirstCredential.click();
      await RedirectModelApp.deleteBtn.click();

      // assert all frames are on a fresh unauthenticated screen
      await assertBothFrames(async () => {
        await assertFreshPage();
        // asserts default was updated as well
        await expect(RedirectModelApp.credentialDefault).toHaveText('null');
      });
    };

    // beforeEach(): request a token from parent
    
    await removeToken();

    // request a token from iframe
    await browser.switchToFrame(await findIFrame());
    await RedirectModelApp.signInBtn.click();
    await performSignIn(true);
    await assertBothFrames(async () => {
      await expect(RedirectModelApp.credentialSize).toHaveText('1');
    });

    await removeToken();
  });
  
  it('can sync a Credential refresh between parent and iframe', async () => {
    // beforeEach(): request a token from parent

    // navigate iframe to secure page
    await browser.switchToFrame(await findIFrame());
    await RedirectModelApp.withDefaultLink.click();
    await assertSecuredPage();

    await browser.switchToParentFrame();
    await RedirectModelApp.selectFirstCredential.click();

    // store first value of access token
    const t1 = await assertTokenValues();

    // refresh the token
    await assertTokenRefresh();

    // store second value of access token
    const t2 = await assertTokenValues();

    // t1 and t2 shouldn't be the same value, if refresh succeed
    expect(t2).not.toEqual(t1);
  });

  it('can sync Credential.default events between parent and iframe', async () => {
    // beforeEach(): request a token from parent

    // request 2nd token
    await RedirectModelApp.signInBtn.click();
    await performSignIn(true);
    await assertBothFrames(async () => {
      await expect(RedirectModelApp.credentialSize).toHaveText('2');
    });

    // delete the default token (via Credential.default)
    await RedirectModelApp.credentialDefault.click();
    await RedirectModelApp.deleteBtn.click();
    await assertBothFrames(async () => {
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
    // await assertBothFrames(async () => {
    //   await expect(RedirectModelApp.credentialDefault).toHaveText(defaultId);
    // });

   // changes the default value manually (without removal)
    await RedirectModelApp.getCredLinkById(leftoverToken).click();
    await RedirectModelApp.setDefaultBtn.click();

    // assert all tabs know of the new default
    const newDefaultId = await browser.execute('return window.Credential.default.id');
    expect(newDefaultId).not.toEqual(null);
    // expect(newDefaultId).not.toEqual(defaultId);
    await assertBothFrames(async () => {
      await expect(RedirectModelApp.credentialDefault).toHaveText(newDefaultId);
    });
  });
});