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
import org.hamcrest.Matchers.allOf
import org.junit.Before
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
                OAuth email (oauthEmail) not found in instrumentation arguments.
                This is set by build.gradle from testenv file.
                Make sure USERNAME is set in your testenv file.
            """.trimIndent())
        
        oauthPassword = args.getString("PASSWORD")
            ?: throw IllegalStateException("""
                OAuth password (oauthPassword) not found in instrumentation arguments.
                This is set by build.gradle from testenv file.
                Make sure PASSWORD is set in your testenv file.
            """.trimIndent())
        
        println("✓ OAuth credentials loaded from instrumentation arguments")
    }

    /**
     * Complete OAuth login flow with valid credentials.
     * 
     * Flow:
     * 1. Espresso: Click OAuth "Request Token" button
     * 2. UIAutomator: Wait for Chrome Custom Tab to open
     * 3. UIAutomator: Enter OAuth provider credentials
     * 4. UIAutomator: Submit login
     * 5. UIAutomator: Wait for deep link redirect back to app
     * 6. Espresso: Verify successful authentication state in the app
     */
    @Test
    fun oauthFlow_CompleteLoginWithValidCredentials() {
        // Phase 1: Espresso - Verify OAuth button and click it
        Thread.sleep(2000) // Allow app to fully load
        
        onView(
            allOf(
                withContentDescription("requestTokenButton"),
                isDisplayed()
            )
        ).perform(click())

        // Phase 2: UIAutomator - Wait for Chrome Custom Tab to open
        val chromeOpened = device.wait(
            Until.hasObject(By.pkg("com.android.chrome")),
            5000
        )
        assert(chromeOpened) { "Chrome Custom Tab should open for OAuth" }

        // Phase 3: UIAutomator - Interact with OAuth provider form
        // Note: This is a simplified example. Real OAuth providers may have different UI.
        // The accessibility tree will expose input fields and buttons from the web form.
        
        try {
            // Look for email input field
            device.findObject(UiSelector().text("username"))?.apply {
                click()
                setText(oauthEmail)
            }

            device.findObject(UiSelector().text("Next"))?.click()

            // Look for password input field
            device.findObject(UiSelector().text("password"))?.apply {
                click()
                setText(oauthPassword)
            }

            // Click sign in / continue button
            device.findObject(UiSelector().text("Verify"))?.click()
        } catch (e: Exception) {
            // If exact matching fails, print debug info
            println("OAuth form interaction error: ${e.message}")
            throw AssertionError("Failed to interact with OAuth provider form: ${e.message}")
        }

        // Phase 4: UIAutomator - Wait for app redirect (deep link callback)
        val appReturned = device.wait(
            Until.hasObject(By.pkg("com.anonymous.reporeactnativeoidc")),
            8000
        )
        assert(appReturned) { "App should receive OAuth callback and regain focus" }

        // Phase 5: Espresso - Verify successful authentication
        Thread.sleep(1000) // Allow app to process the OAuth callback
        
        // Verify that Sign Out button is available (proves we're authenticated)
        onView(
            allOf(
                withContentDescription("signOutButton"),
                isDisplayed()
            )
        ).check(matches(isDisplayed()))
    }

    /**
     * OAuth flow error handling - invalid credentials.
     * 
     * Verifies that the app remains on the login screen if OAuth fails.
     * This tests the error handling path.
     */
    @Test
    fun oauthFlow_InvalidCredentialsShowsError() {
        Thread.sleep(2000)
        
        // Espresso: Click OAuth button
        onView(
            allOf(
                withContentDescription("requestTokenButton"),
                isDisplayed()
            )
        ).perform(click())

        // UIAutomator: Wait for Chrome
        device.wait(Until.hasObject(By.pkg("com.android.chrome")), 5000)

        // UIAutomator: Enter invalid credentials
        device.findObject(UiSelector().text("Username"))?.apply {
            click()
            setText(oauthEmail)
        }

        device.findObject(UiSelector().text("Next"))?.click()

        device.findObject(UiSelector().text("password"))?.apply {
            click()
            setText("invalidPassword999")
        }
        // Click sign in / continue button
        device.findObject(UiSelector().text("Verify"))?.click()

        // UIAutomator: Wait for error message from OAuth provider
        // (OAuth provider will show "Invalid credentials" or similar)
        val errorShown = device.wait(
            Until.hasObject(By.textContains("Invalid")),
            5000
        )
        assert(errorShown) { "OAuth provider should show error for invalid credentials" }

        // UIAutomator: User navigates back to the app
        // (either via back button or by closing the Custom Tab)
        device.pressBack()
        Thread.sleep(1000)
        device.pressBack() // May need to press twice to fully close Custom Tab

        // UIAutomator: Wait for app
        device.wait(Until.hasObject(By.pkg("com.anonymous.reporeactnativeoidc")), 5000)

        // Espresso: Verify we're still on login screen (not authenticated)
        Thread.sleep(1000)
        onView(
            allOf(
                withContentDescription("requestTokenButton"),
                isDisplayed()
            )
        ).check(matches(isDisplayed()))
    }

    /**
     * OAuth flow cancellation - user cancels in Chrome.
     * 
     * Verifies the app handles user cancellation gracefully and remains
     * on the login screen.
     */
    @Test
    fun oauthFlow_UserCancelsInChrome() {
        Thread.sleep(2000)
        
        // Espresso: Click OAuth button
        onView(
            allOf(
                withContentDescription("requestTokenButton"),
                isDisplayed()
            )
        ).perform(click())

        // UIAutomator: Wait for Chrome
        device.wait(Until.hasObject(By.pkg("com.android.chrome")), 5000)

        // UIAutomator: User cancels by:
        // 1. Pressing back button in Chrome
        // 2. Closing the Custom Tab
        // 3. Navigating away
        
        // Simulate user pressing back/canceling
        device.pressBack()
        Thread.sleep(500)
        device.pressBack()

        // UIAutomator: Wait for app to return
        device.wait(Until.hasObject(By.pkg("com.anonymous.reporeactnativeoidc")), 5000)

        // Espresso: Verify still on login screen
        Thread.sleep(1000)
        onView(
            allOf(
                withContentDescription("requestTokenButton"),
                isDisplayed()
            )
        ).check(matches(isDisplayed()))
    }

    /**
     * Post-authentication verification - OAuth redirects back correctly.
     * 
     * Verifies that after successful OAuth login, the app correctly receives
     * the authorization code/token and updates its state.
     */
    @Test
    fun oauthFlow_VerifyTokenReceivedAfterLogin() {
        // Complete the OAuth login flow
        oauthFlow_CompleteLoginWithValidCredentials()

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
    }
}
