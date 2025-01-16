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

describe('Token Broker', () => {
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
      await bootstrap();
      await TokenBrokerApp.waitForMessages();
      const message = await TokenBrokerApp.firstMessageSelector.getText();
      await TokenBrokerApp.refreshMessagesBtn.click();
      const newMessage = await TokenBrokerApp.firstMessageSelector.getText();
      expect(message).not.toEqual(newMessage);
    });

    it('makes dpop-protected resource request after broker tokens are cleared', async () => {
      await bootstrap();
      await TokenBrokerApp.waitForMessages();
      const message = await TokenBrokerApp.firstMessageSelector.getText();
      await TokenBrokerApp.removeBrokerTokensBtn.click();
      await TokenBrokerApp.refreshMessagesBtn.click();
      await performSignIn(true);
      await TokenBrokerApp.waitForMessages();
      const newMessage = await TokenBrokerApp.firstMessageSelector.getText();
      expect(message).not.toEqual(newMessage);
    });

    it('makes dpop-protected resource request after all-scope token is revoked', async () => {
      await bootstrap();
      await TokenBrokerApp.waitForMessages();
      const message = await TokenBrokerApp.firstMessageSelector.getText();
      await TokenBrokerApp.revokeMordorTokenBtn.click();
      await TokenBrokerApp.refreshMessagesBtn.click();
      await TokenBrokerApp.waitForMessages();
      const newMessage = await TokenBrokerApp.firstMessageSelector.getText();
      expect(message).not.toEqual(newMessage);
    });

    it('makes dpop-protected resource request all tokens are cleared', async () => {
      await bootstrap();
      await TokenBrokerApp.waitForMessages();
      const message = await TokenBrokerApp.firstMessageSelector.getText();
      await TokenBrokerApp.revokeMordorTokenBtn.click();
      await TokenBrokerApp.removeBrokerTokensBtn.click();
      await TokenBrokerApp.refreshMessagesBtn.click();
      await performSignIn(true);
      await TokenBrokerApp.waitForMessages();
      const newMessage = await TokenBrokerApp.firstMessageSelector.getText();
      expect(message).not.toEqual(newMessage);
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
      await TokenBrokerApp.waitForIframeLoad();
      await switchToFrame();
      await TokenBrokerApp.waitForMessages();
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
      await browser.pause(2000);
      await switchToFrame();
      await TokenBrokerApp.waitForMessages();
      const newMessage = await TokenBrokerApp.firstMessageSelector.getText();
      expect(firstMessage).not.toEqual(newMessage);
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
});