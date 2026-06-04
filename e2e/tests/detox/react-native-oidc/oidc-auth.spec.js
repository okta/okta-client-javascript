/*!
 * Copyright (c) 2015-present, Okta, Inc. and/or its affiliates. All rights reserved.
 * The Okta software accompanied by this notice is provided pursuant to the Apache License, Version 2.0 (the "License.")
 *
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0.
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * 
 * See the License for the specific language governing permissions and limitations under the License.
 */

describe('React Native OIDC App', () => {
  before(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('Navigation', () => {
    it('should display the Login tab on app launch', async () => {
      const authTitle = await $('~Authentication');
      await expect(authTitle).toBeVisible();
      
      const statusText = await $('~Status:');
      await expect(statusText).toBeVisible();
    });

    it('should navigate to Credentials tab', async () => {
      const credsTab = await $('~Creds');
      await credsTab.tap();
      
      const credsTitle = await $('~Credentials');
      await expect(credsTitle).toBeVisible();
    });

    it('should navigate to Token tab', async () => {
      const tokenTab = await $('~Token');
      await tokenTab.tap();
      
      // Should show either token details or empty state
      try {
        await expect(
          await $('~Token Details')
        ).toBeVisible();
      } catch {
        await expect(
          await $('~No credential found')
        ).toBeVisible();
      }
    });

    it('should return to Login tab', async () => {
      const loginTab = await $('~Login');
      await loginTab.tap();
      
      const authTitle = await $('~Authentication');
      await expect(authTitle).toBeVisible();
    });

    it('should navigate between all tabs sequentially', async () => {
      // Login -> Credentials
      const credsTab = await $('~Creds');
      await credsTab.tap();
      let title = await $('~Credentials');
      await expect(title).toBeVisible();

      // Credentials -> Token
      const tokenTab = await $('~Token');
      await tokenTab.tap();
      try {
        await expect(await $('~Token Details')).toBeVisible();
      } catch {
        await expect(await $('~No credential')).toBeVisible();
      }

      // Token -> Login
      const loginTab = await $('~Login');
      await loginTab.tap();
      const authTitle = await $('~Authentication');
      await expect(authTitle).toBeVisible();
    });
  });

  describe('Authentication Status', () => {
    it('should show "Not Authenticated" status on initial load', async () => {
      const statusElement = await $('**/XCUIElementTypeStaticText[`label CONTAINS "❌ Not Authenticated"`]');
      await expect(statusElement).toBeVisible();
    });

    it('should display authentication status text', async () => {
      const statusText = await $('~Status:');
      await expect(statusText).toBeVisible();
    });

    it('should show Request Token and Sign Out buttons', async () => {
      const requestBtn = await $('~Request Token');
      await expect(requestBtn).toBeVisible();
      
      const signOutBtn = await $('~Sign Out');
      await expect(signOutBtn).toBeVisible();
    });

    it('should initiate login flow when Request Token button is pressed', async () => {
      // Verify we start in unauthenticated state
      const statusElement = await $('**/XCUIElementTypeStaticText[`label CONTAINS "❌ Not Authenticated"`]');
      await expect(statusElement).toBeVisible();
      
      // Press the Request Token button to initiate OAuth flow
      const requestBtn = await $('~Request Token');
      await requestBtn.tap();
      
      // Wait for OAuth session or error
      await driver.pause(500);
      
      // The OAuth authorization session will open
      // This initiates the login flow - actual auth requires test credentials
      // After successful authentication, the app will navigate and store the credential
    });
  });

  describe('Credentials Screen', () => {
    it('should show empty state when no credentials exist', async () => {
      const credsTab = await $('~Creds');
      await credsTab.tap();
      
      const emptyText = await $('~No credentials found.');
      await expect(emptyText).toBeVisible();
    });

    it('should display helpful hint text on empty credentials', async () => {
      const credsTab = await $('~Creds');
      await credsTab.tap();
      
      const hintText = await $('**/XCUIElementTypeStaticText[`label CONTAINS "Sign in from the Auth tab"`]');
      await expect(hintText).toBeVisible();
    });

    it('should have credentials screen title visible', async () => {
      const credsTab = await $('~Creds');
      await credsTab.tap();
      
      const title = await $('~Credentials');
      await expect(title).toBeVisible();
    });
  });

  describe('Token Screen', () => {
    it('should show empty state when no token is selected', async () => {
      const tokenTab = await $('~Token');
      await tokenTab.tap();
      
      const emptyText = await $('~No credential found');
      await expect(emptyText).toBeVisible();
    });

    it('should display hint text for token selection', async () => {
      const tokenTab = await $('~Token');
      await tokenTab.tap();
      
      const hintText = await $('**/XCUIElementTypeStaticText[`label CONTAINS "Go to Credentials tab"`]');
      await expect(hintText).toBeVisible();
    });

    it('should show Token Details title', async () => {
      const tokenTab = await $('~Token');
      await tokenTab.tap();
      
      const title = await $('~Token Details');
      await expect(title).toBeVisible();
    });
  });

  describe('UI Elements and Layout', () => {
    it('should display all UI elements on Login screen', async () => {
      // Verify main content is visible
      const authTitle = await $('~Authentication');
      await expect(authTitle).toBeVisible();
      
      // Verify action messages are visible
      const actionText = await $('**/XCUIElementTypeStaticText[`label CONTAINS "Sign in to get started"`]');
      await expect(actionText).toBeVisible();
    });

    it('should have functioning tab bar with three tabs', async () => {
      // Verify all three tabs are present
      const loginTab = await $('~Login');
      await expect(loginTab).toBeVisible();
      
      const credsTab = await $('~Creds');
      await expect(credsTab).toBeVisible();
      
      const tokenTab = await $('~Token');
      await expect(tokenTab).toBeVisible();
    });

    it('should maintain state when returning to tabs', async () => {
      // Navigate away and back
      const credsTab = await $('~Creds');
      await credsTab.tap();
      let title = await $('~Credentials');
      await expect(title).toBeVisible();

      const loginTab = await $('~Login');
      await loginTab.tap();
      const authTitle = await $('~Authentication');
      await expect(authTitle).toBeVisible();

      // The app should still show the same state
      await credsTab.tap();
      title = await $('~Credentials');
      await expect(title).toBeVisible();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing credentials gracefully', async () => {
      const credsTab = await $('~Creds');
      await credsTab.tap();
      
      // Should show empty state instead of crashing
      const emptyText = await $('~No credentials found');
      await expect(emptyText).toBeVisible();
    });

    it('should handle missing token selection gracefully', async () => {
      const tokenTab = await $('~Token');
      await tokenTab.tap();
      
      // Should show appropriate message instead of crashing
      const errorText = await $('~No credential found');
      await expect(errorText).toBeVisible();
    });
  });

  describe('Tab Navigation Consistency', () => {
    it('should allow rapid tab switching', async () => {
      // Quickly switch between tabs multiple times
      const loginTab = await $('~Login');
      const credsTab = await $('~Creds');
      const tokenTab = await $('~Token');

      for (let i = 0; i < 3; i++) {
        await credsTab.tap();
        await tokenTab.tap();
        await loginTab.tap();
      }

      // Should end up on Login tab without crashing
      const authTitle = await $('~Authentication');
      await expect(authTitle).toBeVisible();
    });

    it('should properly load content for each tab', async () => {
      const loginTab = await $('~Login');
      const credsTab = await $('~Creds');
      const tokenTab = await $('~Token');

      // Login tab content
      await loginTab.tap();
      let title = await $('~Authentication');
      await expect(title).toBeVisible();

      // Credentials tab content
      await credsTab.tap();
      title = await $('~Credentials');
      await expect(title).toBeVisible();

      // Token tab content
      await tokenTab.tap();
      title = await $('~Token Details');
      await expect(title).toBeVisible();
    });
  });

  describe('Loading States', () => {
    it('should eventually load credentials screen', async () => {
      const credsTab = await $('~Creds');
      await credsTab.tap();
      
      // Wait for loading to complete and content to be visible
      const title = await $('~Credentials');
      await driver.waitUntil(
        async () => await title.isDisplayed(),
        { timeout: 5000 }
      );
    });

    it('should eventually load token screen', async () => {
      const tokenTab = await $('~Token');
      await tokenTab.tap();
      
      // Wait for loading to complete
      const title = await $('~Token Details');
      await driver.waitUntil(
        async () => await title.isDisplayed(),
        { timeout: 5000 }
      );
    });
  });
});
