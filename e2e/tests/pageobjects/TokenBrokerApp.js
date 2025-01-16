
class TokenBrokerApp {
  get readySelector () { return $('[data-e2e="ready"]'); }
  get iframeSelector () { return $('[data-e2e="iframe"]'); }
  get messageContainerSelector () { return $('[data-e2e="msg-container"]'); }
  get messageLoaderSelector () { return $('[data-e2e="msg-loader"]'); }
  get firstMessageSelector () {
    return this.messageContainerSelector.$('div.message');
  }

  // buttons
  get signOutBtn () { return $('[data-e2e="signOutBtn"]'); }
  get removeBrokerTokensBtn () { return $('[data-e2e="rmATsBtn"]'); }
  get revokeMordorTokenBtn () { return $('[data-e2e="rvkMordorTkn"]'); }
  get refreshMessagesBtn () { return $('[data-e2e="refreshMsgsBtn"]'); }

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
    }, { timeout: 5000, timeoutMsg: 'wait for messages loadaer' });
  }

  async waitForIframeLoad () {
    return browser.waitUntil(async () => this.iframeSelector.then(el => el.isDisplayed()), { timeout: 5000, timeoutMsg: 'wait for iframe selector' });
  }
}

export default new TokenBrokerApp();
