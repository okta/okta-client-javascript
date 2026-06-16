package com.anonymous.reporeactnativeoidc

import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.action.ViewActions.click
import androidx.test.espresso.assertion.ViewAssertions.matches
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
 * Test Strategy:
 * 1. Use Espresso to navigate to the OAuth login button in the app
 * 2. Click the OAuth button, which launches Chrome Custom Tab
 * 3. Switch to UIAutomator to interact with the Chrome browser and OAuth provider
 * 4. Switch back to Espresso to verify the OAuth callback was received by the app
 */
@RunWith(AndroidJUnit4::class)
class OAuthLoginTest {

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
     * Helper: Ensure Chrome Custom Tab window is in focus and ready for interaction.
     * The Custom Tab should already be open from Phase 2, so we just need to ensure
     * it's in the foreground and responsive.
     */
    private fun ensureChromeInFocus() {
        println("⏳ Ensuring Chrome Custom Tab is active...")
        try {
            // Wait for Chrome to actually be visible and have content
            val chromeVisible = device.wait(
                Until.hasObject(By.pkg("com.android.chrome").depth(0)),
                5000
            )
            
            if (chromeVisible) {
                println("✓ Chrome Custom Tab is visible")
            } else {
                println("⚠️  Chrome not detected as visible, but continuing anyway")
            }
            
            println("✓ Chrome should be ready for interaction")
        } catch (e: Exception) {
            println("⚠️  Error ensuring Chrome focus: ${e.message}")
            // Continue anyway - the Custom Tab should still be there
        }
    }
    
    /**
     * Helper: Wait for webview content to load in Chrome Custom Tab.
     * This ensures the OAuth form is actually rendered before we try to interact.
     */
    private fun waitForWebViewContent(timeoutMs: Long = 8000) {
        println("⏳ Waiting for webview content to load...")
        val startTime = System.currentTimeMillis()
        var contentFound = false
        
        while (System.currentTimeMillis() - startTime < timeoutMs) {
            val webview = device.findObject(By.pkg("com.android.chrome").res(".*"))
            if (webview != null) {
                contentFound = true
                println("✓ Webview content loaded")
                break
            }
            Thread.sleep(500)
        }
        
        if (!contentFound) {
            println("⚠️  Webview content not detected after ${timeoutMs}ms, continuing anyway")
        }
    }

    /**
     * Helper: Input text into a focused field using shell commands
     * This is more reliable than clipboard operations for webview inputs
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
        println("\n🔐 Starting OAuth login test with email: $oauthEmail")
        
        // Wait for app to fully launch
        println("⏳ Waiting for app to launch...")
        device.wait(Until.hasObject(By.pkg("com.anonymous.reporeactnativeoidc")), 10000)
        Thread.sleep(3000) // Extra wait for React Native initialization

        // Phase 2: UIAutomator - Wait for Chrome Custom Tab to open
        println("🌐 Phase 1: Waiting for Chrome Custom Tab to open")
        val chromeOpened = device.wait(
            Until.hasObject(By.pkg("com.android.chrome")),
            8000
        )
        assert(chromeOpened) { "Chrome Custom Tab should open for OAuth" }
        println("✓ Chrome Custom Tab detected")
        
        // Ensure Chrome is in focus
        Thread.sleep(2500) // Wait for Chrome animation
        ensureChromeInFocus()
        waitForWebViewContent()

        // Phase 3: UIAutomator - Interact with OAuth provider form
        // Note: This is a browser-based HTML form, not native Android UI
        // We'll use the input shell command for text and keyboard navigation for UI interaction
        println("📝 Phase 2: Entering credentials in OAuth form")
        try {
            Thread.sleep(500)
            
            // The username field should be auto-focused on the Okta login form
            // Verify what currently has focus
            val focusedElement = device.findObject(By.focused(true))
            if (focusedElement != null) {
                println("  - Currently focused element: ${focusedElement.className}")
            }
            
            println("  - Entering username...")
            pasteText(username)
            println("  ✓ Username entered: $oauthEmail")
            
            // Press Tab to move to next field
            Thread.sleep(500)
            // device.pressKeyCode(KeyEvent.KEYCODE_TAB)
            // Thread.sleep(1500)
            
            // Look for and click the "Next" button
            println("  - Looking for Next button...")
            var nextButton = device.findObject(UiSelector().text("Next").clickable(true))
            if (nextButton != null && nextButton.exists()) {
                nextButton.click()
                println("  ✓ Next button clicked")
            } else {
                // If no visible Next button, press Enter to submit
                println("  ⚠️  Next button not visible, pressing Enter")
                device.pressKeyCode(KeyEvent.KEYCODE_ENTER)
            }
            
            // Wait for password form to load
            Thread.sleep(2500)
            
            // Verify password field is now focused
            val focusedAfterNext = device.findObject(By.focused(true))
            if (focusedAfterNext != null) {
                println("  - Now focused: ${focusedAfterNext.className}")
            }
            
            // Enter password
            println("  - Entering password...")
            pasteText(password)
            println("  ✓ Password entered")
            
            // Look for submit button (Verify, Sign in, etc.)
            Thread.sleep(1000)
            println("  - Looking for Verify/Sign In button...")
            var submitButton = device.findObject(UiSelector().text("Verify").clickable(true))
            if (submitButton == null) {
                submitButton = device.findObject(UiSelector().text("Sign in").clickable(true))
            }
            if (submitButton == null) {
                submitButton = device.findObject(UiSelector().description("Sign In").clickable(true))
            }
            
            if (submitButton != null && submitButton.exists()) {
                submitButton.click()
                println("  ✓ Sign in button clicked")
            } else {
                // Fallback: press Enter
                println("  ⚠️  Submit button not found, pressing Enter")
                device.pressKeyCode(KeyEvent.KEYCODE_ENTER)
            }
            
        } catch (e: Exception) {
            println("❌ OAuth form interaction error: ${e.message}")
            e.printStackTrace()
            throw AssertionError("Failed to interact with OAuth provider form: ${e.message}")
        }

        // Phase 4: UIAutomator - Wait for app redirect (deep link callback)
        println("⏳ Phase 3: Waiting for OAuth callback and app redirect")
        Thread.sleep(3000) // Give OAuth provider time to process
        
        // Wait for Chrome to close and app to return to foreground
        val appInForeground = device.wait(
            Until.hasObject(By.pkg("com.anonymous.reporeactnativeoidc").focused(true)),
            10000
        )
        assert(appInForeground) { "App should receive OAuth callback and return to foreground" }
        
        // Verify Chrome is no longer visible
        val chromeGone = !device.hasObject(By.pkg("com.android.chrome"))
        if (!chromeGone) {
            println("⚠️  Chrome still visible, but app is in foreground")
        }
        
        println("✓ App returned from OAuth flow")

        // Phase 5: Espresso - Verify successful authentication
        println("✅ Phase 4: Verifying successful authentication")
        Thread.sleep(3000) // Allow app to process the OAuth callback
    }

    @Test
    fun oauthFlow_CompleteLoginWithValidCredentials() {
        // Wait for app to fully launch
        println("⏳ Waiting for app to launch...")
        device.wait(Until.hasObject(By.pkg("com.anonymous.reporeactnativeoidc")), 10000)
        Thread.sleep(3000) // Extra wait for React Native initialization

        // confirm fresh state
        onView(withText(containsString("❌ Not Authenticated")))
          .check(matches(isDisplayed()))
        
        // Click Request Token button
        println("Clicking OAuth button in app")
        
        onView(
            allOf(
                withContentDescription("requestTokenButton"),
                isDisplayed()
            )
        ).perform(click())
        println("✓ Request Token button clicked")

        // Complete the OAuth login flow
        performOktaLogin(oauthEmail, oauthPassword)

        // After successful authentication, the fact that we can see the Sign Out button
        // proves that the OAuth flow completed successfully and the app obtained a token.
        // No further verification needed in this test - the previous test validates
        // that the OAuth callback was properly handled by the app.
        Thread.sleep(1000)
        
        onView(
            allOf(
                withContentDescription("signOutButton"),
                isDisplayed()
            )
        ).check(matches(isDisplayed()))

        // confirm fresh state
        onView(withText(containsString("✅ Authenticated")))
          .check(matches(isDisplayed()))
    }
}
