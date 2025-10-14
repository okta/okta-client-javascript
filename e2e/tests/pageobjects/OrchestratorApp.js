
class OrchestratorApp {
  get readySelector () { return $('[data-e2e="ready"]'); }
  get refreshMessagesBtn () { return $('[data-e2e="refreshMsgsBtn"]'); }
  get clearCredentialBtn () { return $('[data-e2e="clearCredentials"]'); }
  get messageContainerSelector () { return $('[data-e2e="msg-container"]'); }
  get messageLoaderSelector () { return $('[data-e2e="msg-loader"]'); }
  get firstMessageSelector () {
    return this.messageContainerSelector.$('div.message');
  }

  async waitForLoad () {
    return browser.waitUntil(async () => this.readySelector.then(el => el.isExisting()), { timeout: 5000, timeoutMsg: 'wait for ready selector' });
  }

  async waitForMessages () {
    return browser.waitUntil(async () => {
      const container = await this.messageContainerSelector;

      return (
        (await container.isDisplayed()) && 
        (await container.$$('div.message')).length > 0
      );
    }, { timeout: 5000, timeoutMsg: 'wait for messages selector' });
  }

  async waitForMessageLoader () {
    return browser.waitUntil(async () => {
      return this.messageLoaderSelector.isDisplayed();
    }, { timeout: 5000, timeoutMsg: 'wait for messages loader' });
  }
}

export default new OrchestratorApp();
