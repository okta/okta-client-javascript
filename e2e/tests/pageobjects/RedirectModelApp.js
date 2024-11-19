
class RedirectModelApp {
  get readySelector () { return $('[data-e2e="ready"]'); }
  get protectedSelector () { return $('[data-e2e="protected"]'); }
  get credentialSize () { return $('[data-e2e="Credential.size"]'); }
  get credentialDefault () { return $('[data-e2e="Credential.default"]'); }

  // credentials
  get selectFirstCredential () {
    return $$('li')[0];
  }

  // tokens
  get accessToken () { return $('[data-e2e="accessToken"]'); }
  get idToken () { return $('[data-e2e="idToken"]'); }
  get refreshToken () { return $('[data-e2e="refreshToken"]'); }

  // secure page links
  get withDefaultLink () { return $('[data-e2e="withDefaultLink"]'); }
  get withTagLink () { return $('[data-e2e="withTagLink"]'); }
  get findCredentialLink () { return $('[data-e2e="findCredentialLink"]'); }
  get backToHome () { return $('[data-e2e="backToHome"]'); }

  // buttons
  get signInBtn () { return $('[data-e2e="signInBtn"]'); }
  get signOutBtn () { return $('[data-e2e="signOutBtn"]'); }
  get clearBtn () { return $('[data-e2e="clearBtn"]'); }
  get refreshBtn () { return $('[data-e2e="refreshBtn"]'); }
  get revokeBtn () { return $('[data-e2e="revokeBtn"]'); }
  get setDefaultBtn () { return $('[data-e2e="setDefaultBtn"]'); }
  get deleteBtn () { return $('[data-e2e="deleteBtn"]'); }

  getCredLinkById (id) {
    return $(`li[data-e2e="cred:${id}"]`);
  }

  async signIn () {
    await this.signInBtn.click();
  }

  async waitForLoad () {
    return browser.waitUntil(async () => this.readySelector.then(el => el.isExisting()), { timeout: 5000, timeoutMsg: 'wait for ready selector' });
  }

  async waitForProtectedPage () {
    return browser.waitUntil(async () => this.protectedSelector.then(el => el.isExisting()), { timeout: 5000, timeoutMsg: 'wait for ready selector' });
  }

  async open (isOIDC = true, openInNewWindow = false) {
    const path = isOIDC ? '/' : '/?oidc=false';
    if (openInNewWindow) {
      await browser.newWindow(path, { windowFeatures: 'noopener=yes' });
    }
    else {
      await browser.url(path);
    }
    await this.waitForLoad();
    return this;
  }
}

export default new RedirectModelApp();
