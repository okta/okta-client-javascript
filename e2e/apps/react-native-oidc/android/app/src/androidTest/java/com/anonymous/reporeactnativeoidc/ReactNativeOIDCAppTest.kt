package com.anonymous.reporeactnativeoidc

import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.action.ViewActions.click
import androidx.test.espresso.action.ViewActions.swipeUp
import androidx.test.espresso.action.ViewActions.swipeDown
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.assertion.ViewAssertions.doesNotExist
import androidx.test.espresso.matcher.ViewMatchers.*
import androidx.test.ext.junit.rules.ActivityScenarioRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.By
import androidx.test.uiautomator.UiDevice
import androidx.test.uiautomator.UiSelector
import androidx.test.uiautomator.Until
import android.os.Bundle
import android.content.Intent
import android.view.KeyEvent
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import org.hamcrest.Matchers.allOf
import org.hamcrest.Matchers.containsString
import org.junit.Before
import org.junit.Ignore
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Hybrid E2E tests for OAuth authentication flows.
 *
 * These tests use a combination of Espresso (for the React Native app) and UIAutomator
 * (for the Chrome Custom Tab OAuth provider interaction).
 *
 */
@RunWith(AndroidJUnit4::class)
class ReactNativeOIDCAppTest {

    @get:Rule
    val activityRule = ActivityScenarioRule(MainActivity::class.java)

    private lateinit var device: UiDevice
    private lateinit var oauthEmail: String
    private lateinit var oauthPassword: String

    @Before
    fun setUp() {
        device = UiDevice.getInstance(InstrumentationRegistry.getInstrumentation())
        
        // Read credentials from instrumentation arguments (set by build.gradle)
        val args: Bundle = InstrumentationRegistry.getArguments()
        
        oauthEmail = args.getString("USERNAME") 
            ?: throw IllegalStateException("""
                OAuth email not found in instrumentation arguments.
                Make sure USERNAME is set in your testenv file.
            """.trimIndent())
        
        oauthPassword = args.getString("PASSWORD")
            ?: throw IllegalStateException("""
                OAuth password not found in instrumentation arguments.
                Make sure PASSWORD is set in your testenv file.
            """.trimIndent())
        
        println("✓ OAuth credentials loaded: email=$oauthEmail")
    }
    
    /**
     * Helper: Wait for Okta login form to be available in Chrome Custom Tab.
     * Ensures Chrome webview content has loaded.
     */
    private fun waitForOktaLogin(timeoutMs: Long = 8000) {
        val chromeLoaded = device.wait(
            Until.hasObject(By.pkg("com.android.chrome").depth(0)),
            timeoutMs
        )
        
        if (!chromeLoaded) {
            throw AssertionError("Chrome Custom Tab webview failed to load after ${timeoutMs}ms - Chrome may not have opened")
        }
    }

    /**
     * Helper: Input text into a focused field using shell commands
     */
    private fun pasteText(text: String) {
        try {
            println("  Inputting text: $text")
            
            // Clear any existing content first by selecting all and deleting
            device.pressKeyCode(KeyEvent.KEYCODE_A, KeyEvent.META_CTRL_ON)
            Thread.sleep(100)
            device.pressKeyCode(KeyEvent.KEYCODE_DEL)
            Thread.sleep(200)
            
            // Use shell command to input text directly
            // Input command handles most special characters natively
            device.executeShellCommand("input text $text")
            
            Thread.sleep(500)
        } catch (e: Exception) {
            println("❌ Text input failed: ${e.message}")
            throw Exception("Failed to input text: ${e.message}", e)
        }
    }

    private fun assertFreshAppState() {
      // wait for app to fully launch
      device.wait(Until.hasObject(By.pkg("com.anonymous.reporeactnativeoidc")), 10000)
      Thread.sleep(3000)

      // confirm on Login tab
      onView(withText(containsString("Authentication")))
        .check(matches(isDisplayed()))

      // clear existing tokens, etc
      performClearFromLoginTab()
      navigateToTab("Login")

      onView(withText(containsString("❌ Not Authenticated")))
        .check(matches(isDisplayed()))
      
      // click `Creds` tab
      navigateToTab("Creds")

      // confirm fresh state
      onView(withText(containsString("No credentials found.")))
        .check(matches(isDisplayed()))

      // click `Token` tab
      navigateToTab("Token")

      // confirm fresh state
      onView(withText(containsString("No credential found")))
        .check(matches(isDisplayed()))

      // click `Login` tab
      navigateToTab("Login")
    }

    /**
     * Helper: Determines the authentication status of the Test App
     */
    private fun verifyAuthenticationStatus(expectAuthenticated: Boolean): Boolean {
        return try {
            val expectedStatus = if (expectAuthenticated) "✅ Authenticated" else "❌ Not Authenticated"
            onView(withText(containsString(expectedStatus)))
              .check(matches(isDisplayed()))
            true  // Element found
        } catch (e: Exception) {
            false  // Element not found
        }
    }

    /**
     * Helper: Navigates between tabs within the Test App
     */
    private fun navigateToTab(tab: String) {
        val tabConfig: Map<String, Map<String, String>> = mapOf(
          "Login" to mapOf(
              "contentDesc" to "loginTab",
              "title" to "Authentication"
          ),
          "Creds" to mapOf(
              "contentDesc" to "credentialsTab",
              "title" to "Credentials"
          ),
          "Token" to mapOf(
              "contentDesc" to "tokenTab",
              "title" to "Token Details"
          )
      )

      // click `Token` tab
      onView(
          allOf(
              withContentDescription(tabConfig[tab]?.get("contentDesc")),
              isDisplayed()
          )
      ).perform(click())

      Thread.sleep(250)   // wait for UI animations

      onView(withText(containsString(tabConfig[tab]?.get("title"))))
        .check(matches(isDisplayed()))
    }

    /**
     * Complete OAuth login flow.
     *
     * Pre-req: Auth flow has already be started
     * 
     * Flow:
     * 1. UIAutomator: Wait for Chrome Custom Tab to open
     * 2. UIAutomator: Enter OAuth provider credentials
     * 3. UIAutomator: Submit login
     * 4. UIAutomator: Wait for deep link redirect back to app
     * 5. Espresso: Verify successful authentication state in the app
     */
    fun performOktaLogin(username: String, password: String) {
        // confirms Chrome opened succesfully
        waitForOktaLogin()

        try {
            Thread.sleep(500)

            // ### Identify Page

            // confirms Identify page loaded
            device.wait(
                Until.hasObject(By.text("Sign In")),
                5000
            )
            
            // username field should be auto-focused, simply paste text and continue
            pasteText(username)
            device.pressKeyCode(KeyEvent.KEYCODE_ENTER)   // submits form
            Thread.sleep(2500)    // wait for UI transition

            // ### Select Authenticator Page

            // check for and handle possible Select Authenticator Page
            val onSelectAuthenticatorPage = device.findObject(UiSelector().text("Verify it's you with a security method")).exists()
            if (onSelectAuthenticatorPage) {
              // written for a user who has 2 authenticators (Email and Password)
              // tab select to the 2nd button to select 'Password'
              val selectPasswordButton = device.findObject(
                By.desc("Select Password.")
              )
              if (selectPasswordButton != null) {
                selectPasswordButton.click()
              }

              Thread.sleep(2500)    // wait for UI transition
            }

            // ### Challenge Password Page

            // confirms Challenge Password page loaded
            val titleLoaded = device.wait(
                Until.hasObject(By.text("Verify with your password")),
                5000
            )

            // password field should be auto-focused, simply paste text and continue
            pasteText(password)
            device.pressKeyCode(KeyEvent.KEYCODE_ENTER)      // submits form            
        } catch (e: Exception) {
            println("❌ OAuth form interaction error: ${e.message}")
            e.printStackTrace()
            throw AssertionError("Failed to interact with OAuth provider form: ${e.message}")
        }

        // wait for UI animations
        Thread.sleep(3000)
        
        // wait for Chrome to close and app to return to foreground
        val appInForeground = device.wait(
            Until.hasObject(By.pkg("com.anonymous.reporeactnativeoidc").focused(true)),
            10000
        )
        assert(appInForeground) { "App should receive OAuth callback and return to foreground" }
        
        // verify Chrome is no longer visible
        val chromeGone = !device.hasObject(By.pkg("com.android.chrome"))
        if (!chromeGone) {
            println("⚠️  Chrome still visible, but app is in foreground")
        }

        // wait for OAuth callback exchange
        Thread.sleep(3000)
    }

    fun performLoginFromLoginTab() {
        // click `Request Token` button
        onView(
            allOf(
                withContentDescription("requestTokenButton"),
                isDisplayed()
            )
        ).perform(click())

        // complete the OAuth login flow
        performOktaLogin(oauthEmail, oauthPassword)

        Thread.sleep(1000)

        // confirm fresh state
        onView(withText(containsString("✅ Authenticated")))
          .check(matches(isDisplayed()))
    }

    fun performLogoutFromLoginTab() {
        // click `Sign Out` button
        onView(
            allOf(
                withContentDescription("signOutButton"),
                isDisplayed()
            )
        ).perform(click())

        Thread.sleep(2000)

        // confirm fresh state
        onView(withText(containsString("❌ Not Authenticated")))
          .check(matches(isDisplayed()))
    }

    fun performClearFromLoginTab() {
        // click `Clear` button
        onView(
            allOf(
                withContentDescription("clearButton"),
                isDisplayed()
            )
        ).perform(click())

        Thread.sleep(2000)

        // confirm fresh state
        onView(withText(containsString("❌ Not Authenticated")))
          .check(matches(isDisplayed()))
    }

    @Test
    fun oauthFlow_CompleteLoginWithValidCredentials() {
        assertFreshAppState()

        // confirm fresh state
        onView(withText(containsString("❌ Not Authenticated")))
          .check(matches(isDisplayed()))
        
        performLoginFromLoginTab()
    }

    @Test
    fun oauthFlow_ChromeTabClosedBeforeCompletion() {
        // wait for app to fully launch
        device.wait(Until.hasObject(By.pkg("com.anonymous.reporeactnativeoidc")), 10000)
        Thread.sleep(3000)

        // confirm fresh state
        onView(withText(containsString("❌ Not Authenticated")))
          .check(matches(isDisplayed()))
        
        // click `Request Token` button
        onView(
            allOf(
                withContentDescription("requestTokenButton"),
                isDisplayed()
            )
        ).perform(click())

        waitForOktaLogin()

        // close Chrome Custom Tab by clicking the X button in the top left
        val closeButtonAlt = device.findObject(By.res("com.android.chrome:id/close_button"))
        if (closeButtonAlt != null) {
            closeButtonAlt.click()
        } else {
            throw AssertionError("Could not find Chrome close button")
        }

        // wait for Chrome to close and app to return to foreground
        val appInForeground = device.wait(
            Until.hasObject(By.pkg("com.anonymous.reporeactnativeoidc").focused(true)),
            10000
        )
        assert(appInForeground) { "App should return to foreground after Chrome closes" }

        // wait for app to process the dismissal
        Thread.sleep(2000)

        // confir, app is still in "Not Authenticated" state (no OAuth callback received)
        onView(withText(containsString("❌ Not Authenticated")))
          .check(matches(isDisplayed()))
    }

    @Test
    fun oauthFlow_TokenRevokeAfterLogin() {
      if (verifyAuthenticationStatus(false)) {
          performLoginFromLoginTab()
      }
      else {
        println("⚠️  Skipping login, already authenticated")
      }

      Thread.sleep(2000)

      performLogoutFromLoginTab()
    }

    @Test
    fun oauthFlow_RequestMultipleTokens() {
        // wait for app to fully launch
        assertFreshAppState()
        
        // perform 2 logins to acquire 2 tokens
        // (this test assumes ephemeralSession and therefore no bound redirect will occur)
        performLoginFromLoginTab()
        Thread.sleep(2000)
        performLoginFromLoginTab()
        Thread.sleep(2000)

        // navigate to the Creds tabs to confirm multiple Credentials exist
        // (this will help test the Credential/TokenStorage layers)
        navigateToTab("Creds")

        onView(withText(containsString("2 credentials stored")))
          .check(matches(isDisplayed()))

        onView(withText(containsString("DEFAULT")))
          .check(matches(isDisplayed()))

        // navigate to the Token tab to revoke the default Credential
        // (this will further help test the Credential/TokenStorage layers)
        // NOTE: the Token tab will load the default Credential by default
        navigateToTab("Token")

        Thread.sleep(250)

        // find 'Revoke Token' button and click (scroll to bottom to find it)
        onView(isRoot()).perform(
            swipeUp(),
            swipeUp(),
            swipeUp()
        )
        Thread.sleep(250)
        onView(
            allOf(
                withContentDescription("revokeTokenButton"),
                isDisplayed()
            )
        ).perform(click())

        Thread.sleep(1500)

        onView(isRoot()).perform(
            swipeDown(),
            swipeDown(),
            swipeDown()
        )
        Thread.sleep(250)

        // assert a Credential was removed (there is now 1 less)
        // and the 'DEFAULT' badge doesn't exist (the default Credential should have been removed)
        onView(withText(containsString("1 credential stored")))
          .check(matches(isDisplayed()))
        onView(withText(containsString("DEFAULT")))
          .check(doesNotExist())
    }
}
