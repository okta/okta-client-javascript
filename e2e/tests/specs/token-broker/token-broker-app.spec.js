import TokenBrokerApp from '../../pageobjects/TokenBrokerApp';
import OktaLogin from '@repo/e2e.helpers/pageobjects/OktaLogin';


process.env.ORG_OIE_ENABLED = true;

const USERNAME = process.env.USERNAME;
const PASSWORD = process.env.PASSWORD;


const performSignIn = async (shouldBounceRedirect = false) => {
  await browser.switchToParentFrame();
  if (!shouldBounceRedirect) {
    await OktaLogin.waitForLoad();
    await OktaLogin.signin(USERNAME, PASSWORD);
  }
  await expect(browser).toHaveUrlContaining('http://localhost:8080/');
  await TokenBrokerApp.waitForLoad();
};

const switchToFrame = async () => {
  return await browser.switchToFrame(await TokenBrokerApp.iframeSelector);
};

// NOTE: this is a dpop-protected test app
describe('Token Broker', () => {
  let tokenEndpoint;
  beforeEach(async () => {
    // Expected calls per app load
    // 1 - Morodor Token request: 400 (requires dpop nonce)
    // 2 - Mordor Token retry: 200 (includes dpop nonce)
    // 3 - Resource Token request: 200 (uses cached nonce)
    tokenEndpoint = await browser.mock(`${new URL(process.env.ISSUER).origin}/**/v1/token`, { method: 'post' });
  });

  afterEach(async () => {
    await browser.reloadSession();
  });

  describe('Web App Integration', () => {
    const bootstrap = async (path = '/') => {
      await browser.url(path);
      // app should redirect to SIW upon opening in unauthenticated state
      await OktaLogin.waitForLoad();
      await performSignIn();
    };

    it('makes dpop-protected resource request', async () => {
      expect(tokenEndpoint.calls.length).toEqual(0);
      await bootstrap();
      await TokenBrokerApp.waitForMessages();
      const message = await TokenBrokerApp.firstMessageSelector.getText();
      // see explanation by spy definition
      expect(tokenEndpoint.calls.length).toEqual(3);

      // THEN: refreshes message list
      await TokenBrokerApp.refreshMessagesBtn.click();
      const newMessage = await TokenBrokerApp.firstMessageSelector.getText();
      expect(message).not.toEqual(newMessage);
      // resource token is available, no new tokens requests are made
      expect(tokenEndpoint.calls.length).toEqual(3);
    });

    it('makes dpop-protected resource request after broker tokens are cleared', async () => {
      expect(tokenEndpoint.calls.length).toEqual(0);
      await bootstrap();
      await TokenBrokerApp.waitForMessages();
      const message = await TokenBrokerApp.firstMessageSelector.getText();
      // see explanation by spy definition
      expect(tokenEndpoint.calls.length).toEqual(3);

      // THEN: removes resource token, refreshes message list
      await TokenBrokerApp.removeBrokerTokensBtn.click();
      await TokenBrokerApp.refreshMessagesBtn.click();
      await performSignIn(true);
      await TokenBrokerApp.waitForMessages();
      const newMessage = await TokenBrokerApp.firstMessageSelector.getText();
      expect(message).not.toEqual(newMessage);
      // broker makes resource token request, but cached nonce is used (therefore request is successful)
      expect(tokenEndpoint.calls.length).toEqual(4);
    });

    it('makes dpop-protected resource request after all-scope token is revoked', async () => {
      expect(tokenEndpoint.calls.length).toEqual(0);
      await bootstrap();
      await TokenBrokerApp.waitForMessages();
      const message = await TokenBrokerApp.firstMessageSelector.getText();
      // see explanation by spy definition
      expect(tokenEndpoint.calls.length).toEqual(3);

      // THEN: removes mordor token, refreshes message list
      await TokenBrokerApp.revokeMordorTokenBtn.click();
      await browser.pause(500);    // gives time for revoke to complete
      await TokenBrokerApp.refreshMessagesBtn.click();
      await TokenBrokerApp.waitForMessages();
      const newMessage = await TokenBrokerApp.firstMessageSelector.getText();
      expect(message).not.toEqual(newMessage);
      // resource token is still available, no new tokens requests are made
      expect(tokenEndpoint.calls.length).toEqual(3);
    });

    it('makes dpop-protected resource request all tokens are cleared', async () => {
      expect(tokenEndpoint.calls.length).toEqual(0);
      await bootstrap();
      await TokenBrokerApp.waitForMessages();
      const message = await TokenBrokerApp.firstMessageSelector.getText();
      // see explanation by spy definition
      expect(tokenEndpoint.calls.length).toEqual(3);

      // THEN: removes mordor token, removes resource token, refresh message list
      await TokenBrokerApp.revokeMordorTokenBtn.click();
      await browser.pause(500);    // gives time for revoke to complete
      await TokenBrokerApp.removeBrokerTokensBtn.click();
      await TokenBrokerApp.refreshMessagesBtn.click();
      await performSignIn(true);
      await TokenBrokerApp.waitForMessages();
      const newMessage = await TokenBrokerApp.firstMessageSelector.getText();
      expect(message).not.toEqual(newMessage);
      // requests for a mordor and resource token are made, however they use the cached nonce
      expect(tokenEndpoint.calls.length).toEqual(5);
    });
  });

  describe('Iframed App Integration', () => {
    const bootstrap = async (path = '/embedded') => {
      await browser.url(path);
      // app should redirect to SIW upon opening in unauthenticated state
      await OktaLogin.waitForLoad();
      await performSignIn();
      await switchToFrame();
      await TokenBrokerApp.waitForMessages();
      const message = await TokenBrokerApp.firstMessageSelector.getText();
      return message;
    };

    it('makes dpop-protected resource request', async () => {
      expect(tokenEndpoint.calls.length).toEqual(0);
      const firstMessage = await bootstrap();
      // see explanation by spy definition
      expect(tokenEndpoint.calls.length).toEqual(3);

      // THEN: refreshes message list
      await TokenBrokerApp.refreshMessagesBtn.click();
      const newMessage = await TokenBrokerApp.firstMessageSelector.getText();
      expect(firstMessage).not.toEqual(newMessage);
      // resource token is available, no new tokens requests are made
      expect(tokenEndpoint.calls.length).toEqual(3);
    });

    it('makes dpop-protected resource request after broker tokens are cleared', async () => {
      expect(tokenEndpoint.calls.length).toEqual(0);
      const firstMessage = await bootstrap();
      // see explanation by spy definition
      expect(tokenEndpoint.calls.length).toEqual(3);

      // THEN: removes resource token, refreshes message list
      await browser.switchToParentFrame();
      await TokenBrokerApp.removeBrokerTokensBtn.click();
      await switchToFrame();
      await TokenBrokerApp.refreshMessagesBtn.click();
      await performSignIn(true);
      await TokenBrokerApp.waitForIframeLoad();
      await switchToFrame();
      await TokenBrokerApp.waitForMessages();
      const newMessage = await TokenBrokerApp.firstMessageSelector.getText();
      expect(firstMessage).not.toEqual(newMessage);
      // broker makes resource token request, but cached nonce is used (therefore request is successful)
      expect(tokenEndpoint.calls.length).toEqual(4);
    });
  
    it('makes dpop-protected resource request after all-scope token is revoked', async () => {
      expect(tokenEndpoint.calls.length).toEqual(0);
      const firstMessage = await bootstrap();
      // see explanation by spy definition
      expect(tokenEndpoint.calls.length).toEqual(3);

      // THEN: removes mordor token, refreshes message list
      await browser.switchToParentFrame();
      await TokenBrokerApp.revokeMordorTokenBtn.click();
      await browser.pause(500);    // gives time for revoke to complete
      await switchToFrame();
      await TokenBrokerApp.refreshMessagesBtn.click();
      await TokenBrokerApp.waitForMessages();
      const newMessage = await TokenBrokerApp.firstMessageSelector.getText();
      expect(firstMessage).not.toEqual(newMessage);
      // resource token is still available, no new tokens requests are made
      expect(tokenEndpoint.calls.length).toEqual(3);
    });

    it('makes dpop-protected resource request all tokens are cleared', async () => {
      expect(tokenEndpoint.calls.length).toEqual(0);
      const firstMessage = await bootstrap();
      // see explanation by spy definition
      expect(tokenEndpoint.calls.length).toEqual(3);

      await browser.switchToParentFrame();
      await TokenBrokerApp.revokeMordorTokenBtn.click();
      await browser.pause(500);    // gives time for revoke to complete
      await TokenBrokerApp.removeBrokerTokensBtn.click();
      await switchToFrame();
      await TokenBrokerApp.refreshMessagesBtn.click();
      await performSignIn(true);
      await TokenBrokerApp.waitForIframeLoad();
      await browser.pause(2000);
      await switchToFrame();
      await TokenBrokerApp.waitForMessages();
      const newMessage = await TokenBrokerApp.firstMessageSelector.getText();
      expect(firstMessage).not.toEqual(newMessage);
      // requests for a mordor and resource token are made, however they use the cached nonce
      expect(tokenEndpoint.calls.length).toEqual(5);
    });
  });

  // TODO: cross-origin iframes are not explicitly needed at this time, skipping tests
  // for now until full support is added

  // tests iframe at same domain, but cross origin
  // this test requires a /etc/hosts entry (127.0.0.1 app.localhost)
  xdescribe('Iframed (Cross-Origin) App Integration', () => {

    const bootstrap = async (path = '/embedded?xdomain=1') => {
      await browser.url(path);      // triggers login
      await OktaLogin.waitForLoad();
      await performSignIn();
      await TokenBrokerApp.waitForIframeLoad();
      const iframeElement = await TokenBrokerApp.iframeSelector;
      await expect(iframeElement).toHaveAttribute('src', 'http://app.localhost:8080/messages');
      await browser.debug();
      await switchToFrame();
      await TokenBrokerApp.waitForMessages();
      const message = await TokenBrokerApp.firstMessageSelector.getText();
      return message;
    };

    it('makes dpop-protected resource request', async () => {
      const firstMessage = await bootstrap();
      await TokenBrokerApp.refreshMessagesBtn.click();
      const newMessage = await TokenBrokerApp.firstMessageSelector.getText();
      expect(firstMessage).not.toEqual(newMessage);
    });

    it('makes dpop-protected resource request after broker tokens are cleared', async () => {
      const firstMessage = await bootstrap();
      await browser.switchToParentFrame();
      await TokenBrokerApp.removeBrokerTokensBtn.click();
      await switchToFrame();
      await TokenBrokerApp.refreshMessagesBtn.click();
      await performSignIn(true);
      const newMessage = await TokenBrokerApp.firstMessageSelector.getText();
      expect(firstMessage).not.toEqual(newMessage);
    });

    it('makes dpop-protected resource request after all-scope token is revoked', async () => {
      const firstMessage = await bootstrap();
      await browser.switchToParentFrame();
      await TokenBrokerApp.revokeMordorTokenBtn.click();
      await switchToFrame();
      await TokenBrokerApp.refreshMessagesBtn.click();
      await TokenBrokerApp.waitForMessages();
      const newMessage = await TokenBrokerApp.firstMessageSelector.getText();
      expect(firstMessage).not.toEqual(newMessage);
    });

    it('makes dpop-protected resource request all tokens are cleared', async () => {
      const firstMessage = await bootstrap();
      await browser.switchToParentFrame();
      await TokenBrokerApp.revokeMordorTokenBtn.click();
      await TokenBrokerApp.removeBrokerTokensBtn.click();
      await switchToFrame();
      await TokenBrokerApp.refreshMessagesBtn.click();
      await performSignIn(true);
      await TokenBrokerApp.waitForIframeLoad();
      await switchToFrame();
      await TokenBrokerApp.waitForMessageLoader();
      await TokenBrokerApp.waitForMessages();
      const newMessage = await TokenBrokerApp.firstMessageSelector.getText();
      expect(firstMessage).not.toEqual(newMessage);
    });
  });

  describe('Acr Step Up', () => {
    const bootstrap = async (path = '/') => {
      await browser.url(path);
      // app should redirect to SIW upon opening in unauthenticated state
      await OktaLogin.waitForLoad();
      await performSignIn();
    };

    it('will trigger a step-up authentication flow via popup window', async () => {
      // initial load
      await bootstrap('?acr=1');
      await TokenBrokerApp.waitForMessages();
      const message = await TokenBrokerApp.firstMessageSelector.getText();

      // trigger step up auth flow
      await TokenBrokerApp.refreshMessagesBtn.click();

      // popup window will "bounce redirect", no need to select popup window and interact

      await TokenBrokerApp.waitForMessages();
      const newMessage = await TokenBrokerApp.firstMessageSelector.getText();

      expect(message).not.toEqual(newMessage);
    });
  });
});