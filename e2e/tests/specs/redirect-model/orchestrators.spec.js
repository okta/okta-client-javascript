import RedirectModelApp from '../../pageobjects/RedirectModelApp';
import OrchestratorApp from '../../pageobjects/OrchestratorApp';
import OktaLogin from '@repo/e2e.helpers/pageobjects/OktaLogin';

process.env.ORG_OIE_ENABLED = true;

const USERNAME = process.env.USERNAME;
const PASSWORD = process.env.PASSWORD;


const performSignIn = async (shouldBounceRedirect = false) => {
  if (!shouldBounceRedirect) {
    await OktaLogin.waitForLoad();
    await OktaLogin.signin(USERNAME, PASSWORD);
  }
  await OrchestratorApp.waitForLoad();
};


describe('Orchestrators', () => {
  const bootstrap = async (path) => {
    await browser.url('/orchestrator' + path);
    await OrchestratorApp.waitForLoad();
  };

  beforeEach(async () => {
    browser.url('/');
    await RedirectModelApp.signIn();
    await performSignIn();
  });

  afterEach(async () => {
    await browser.reloadSession();
  });

  async function testOrchestrator (path) {
    await bootstrap(path);
    await OrchestratorApp.waitForMessages();
    const message = await OrchestratorApp.firstMessageSelector.getText();
    expect(message).toBeDefined();

    // refresh messages
    await OrchestratorApp.refreshMessagesBtn.click();
    await OrchestratorApp.waitForMessages();
    const refreshMessage = await OrchestratorApp.firstMessageSelector.getText();
    expect(refreshMessage).not.toEqual(message);

    // clear credentials
    await OrchestratorApp.clearCredentialBtn.click();
    await performSignIn(true);
    await OrchestratorApp.refreshMessagesBtn.click();
    await OrchestratorApp.waitForMessages();
    const clearMessage = await OrchestratorApp.firstMessageSelector.getText();
    expect(clearMessage).not.toEqual(message);
    expect(clearMessage).not.toEqual(refreshMessage);

    await OrchestratorApp.clearCredentialBtn.click();
  }

  describe('AuthorizationCodeFlowOrchestrator', () => {
    it('redirect', async () => {
      await testOrchestrator('/redirect');
    });

    it('redirect and persist query params', async () => {
      await testOrchestrator('/redirect?foo=1');
      await expect(browser).toHaveUrlContaining('http://localhost:8080/orchestrator/redirect?foo=1');
    });

    it('redirect and persist url hash value', async () => {
      await testOrchestrator('/redirect#foo');
      await expect(browser).toHaveUrlContaining('http://localhost:8080/orchestrator/redirect#foo');
    });

    it('silent', async () => {
      await testOrchestrator('/silent');
    });
  });

  describe('HostOrchestrator.ProxyHost', () => {
    it('AuthorizationCodeFlowOrchestrator (redirect)', async () => {
      await testOrchestrator('/proxyhost');
    });
  });

});
