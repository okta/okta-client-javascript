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


  let messagesMock;

  beforeEach(async function setup () {
    messagesMock = await browser.mock(`**/api/messages`, { method: 'get' });

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

    // Test to confirm AuthCodeOrchestrator gracefully handles access tokens being revoked outside of the application itself
    it('Out-of-band Token Revocation', async () => {
      // load app as normal
      await bootstrap('/redirect');
      await OrchestratorApp.waitForMessages();
      const message1 = await OrchestratorApp.firstMessageSelector.getText();
      expect(message1).toBeDefined();

      expect(messagesMock.calls.length).toBe(1);

      // /api/messages -> returns 401 (mocking token being revoked out-of-band; using revoked token against RS will result in 401)
      messagesMock.respondOnce({}, { statusCode: 401, fetchResponse: false });

      // This should return mocked 401 and trigger redirect to /authorize (since previously used access token has been removed from storage)
      await OrchestratorApp.refreshMessagesBtn.click();
      await performSignIn(true);    // expected bounce redirect since IDP session exists

      // confirm the app loads after bounce redirect
      await OrchestratorApp.waitForMessages();
      const message2 = await OrchestratorApp.firstMessageSelector.getText();
      expect(message2).toBeDefined();

      expect(messagesMock.calls.length).toBe(3);

      // first request: Page load request
      // second request: Mocked 401 response, triggers token storage removal
      // third (final) request: No token is availabe, makes /authorize call to fetch new token (bounce redirect), and makes request with new token
      const authHeaders = messagesMock.calls.map(call => call.headers['Authorization']);
      expect(authHeaders[0]).toEqual(authHeaders[1]);         // page load request and 401 will use the same token (app doesn't know token is revoked yet)
      expect(authHeaders[0]).not.toEqual(authHeaders[2]);     // page load request and final request will use different tokens (once 401 occurs, token will be replaced)
      expect(authHeaders[1]).not.toEqual(authHeaders[2]);     // 401 and final request also use different tokens (401 will trigger token to be replaced)
    });
  });

  describe('HostOrchestrator.ProxyHost', () => {
    it('AuthorizationCodeFlowOrchestrator (redirect)', async () => {
      await testOrchestrator('/proxyhost');
    });
  });

});
