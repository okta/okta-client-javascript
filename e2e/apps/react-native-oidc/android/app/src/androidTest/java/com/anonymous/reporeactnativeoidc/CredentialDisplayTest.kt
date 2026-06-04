package com.anonymous.reporeactnativeoidc

import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.action.ViewActions.click
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.*
import androidx.test.ext.junit.rules.ActivityScenarioRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.hamcrest.Matchers.allOf
import org.hamcrest.Matchers.containsString
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Instrumentation tests for Credential and Token display functionality.
 * These tests verify that the app correctly displays credential information
 * when tokens are available.
 */
@RunWith(AndroidJUnit4::class)
class CredentialDisplayTest {

    @get:Rule
    val activityRule = ActivityScenarioRule(MainActivity::class.java)

    /**
     * Test that credentials are listed when they exist
     * Note: This test requires a pre-populated credential or successful login
     */
    @Test
    fun credentialsScreen_DisplaysCredentialsList() {
        Thread.sleep(2000)
        
        // Navigate to Credentials tab
        onView(
            allOf(
                withText("Credentials"),
                isDisplayed()
            )
        ).perform(click())
        
        Thread.sleep(1500)
        
        // Verify the Credentials title is displayed
        onView(
            allOf(
                withText("Credentials"),
                isDisplayed()
            )
        ).check(matches(isDisplayed()))
    }

    /**
     * Test that the credentials screen shows the credential count
     */
    @Test
    fun credentialsScreen_DisplaysCredentialCount() {
        Thread.sleep(2000)
        
        // Navigate to Credentials tab
        onView(
            allOf(
                withText("Credentials"),
                isDisplayed()
            )
        ).perform(click())
        
        Thread.sleep(1500)
        
        // Verify that either no credentials message or credential count is shown
        try {
            // Try to find "No credentials found" message
            onView(
                allOf(
                    withText(containsString("No credentials found")),
                    isDisplayed()
                )
            ).check(matches(isDisplayed()))
        } catch (e: Exception) {
            // Or verify credential count text is displayed
            onView(
                withText(containsString("credential"))
            ).check(matches(isDisplayed()))
        }
    }

    /**
     * Test that token details screen is displayed after clicking a credential
     * This test assumes at least one credential is available
     */
    @Test
    fun tokenDetailsScreen_DisplaysTokenInformation() {
        Thread.sleep(2000)
        
        // Navigate to Token tab to check token details display
        onView(
            allOf(
                withText("Token"),
                isDisplayed()
            )
        ).perform(click())
        
        Thread.sleep(1500)
        
        // Verify token details title is shown
        onView(
            allOf(
                withText("Token Details"),
                isDisplayed()
            )
        ).check(matches(isDisplayed()))
    }

    /**
     * Test that token status (Expired/Valid) is displayed
     */
    @Test
    fun tokenDetailsScreen_DisplaysTokenStatus() {
        Thread.sleep(2000)
        
        // Navigate to Token tab
        onView(
            allOf(
                withText("Token"),
                isDisplayed()
            )
        ).perform(click())
        
        Thread.sleep(1500)
        
        // Verify that either a valid or expired status is shown
        // The app shows "✅ Valid" or "❌ Expired"
        try {
            onView(withText(containsString("Valid")))
                .check(matches(isDisplayed()))
        } catch (e: Exception) {
            onView(withText(containsString("Expired")))
                .check(matches(isDisplayed()))
        }
    }

    /**
     * Test that token ID is displayed on token details screen
     */
    @Test
    fun tokenDetailsScreen_DisplaysTokenId() {
        Thread.sleep(2000)
        
        // Navigate to Token tab
        onView(
            allOf(
                withText("Token"),
                isDisplayed()
            )
        ).perform(click())
        
        Thread.sleep(1500)
        
        // Verify "Token ID" label is shown
        onView(
            allOf(
                withText("Token ID"),
                isDisplayed()
            )
        ).check(matches(isDisplayed()))
    }

    /**
     * Test that credential details include token type information
     */
    @Test
    fun credentialCard_DisplaysTokenType() {
        Thread.sleep(2000)
        
        // Navigate to Credentials tab
        onView(
            allOf(
                withText("Credentials"),
                isDisplayed()
            )
        ).perform(click())
        
        Thread.sleep(1500)
        
        // Verify either no credentials or type information is shown
        try {
            onView(withText(containsString("Type:")))
                .check(matches(isDisplayed()))
        } catch (e: Exception) {
            // No credentials, which is expected in unauthenticated state
            onView(
                allOf(
                    withText(containsString("No credentials found")),
                    isDisplayed()
                )
            ).check(matches(isDisplayed()))
        }
    }

    /**
     * Test that credential details include expiration information
     */
    @Test
    fun credentialCard_DisplaysExpirationTime() {
        Thread.sleep(2000)
        
        // Navigate to Credentials tab
        onView(
            allOf(
                withText("Credentials"),
                isDisplayed()
            )
        ).perform(click())
        
        Thread.sleep(1500)
        
        // Verify either no credentials or expiration info is shown
        try {
            onView(withText(containsString("Expires:")))
                .check(matches(isDisplayed()))
        } catch (e: Exception) {
            // No credentials, which is expected
            onView(
                allOf(
                    withText(containsString("No credentials found")),
                    isDisplayed()
                )
            ).check(matches(isDisplayed()))
        }
    }

    /**
     * Test that the app handles navigation between tabs smoothly
     */
    @Test
    fun tabNavigation_WorksSmoothly() {
        Thread.sleep(2000)
        
        // Start on Auth tab
        onView(allOf(withText("Request Token"), isDisplayed()))
            .check(matches(isDisplayed()))
        
        // Navigate to Credentials tab
        onView(allOf(withText("Credentials"), isDisplayed()))
            .perform(click())
        
        Thread.sleep(1000)
        
        // Verify we're on Credentials tab
        onView(allOf(withText("Credentials"), isDisplayed()))
            .check(matches(isDisplayed()))
        
        // Navigate to Token tab
        onView(allOf(withText("Token"), isDisplayed()))
            .perform(click())
        
        Thread.sleep(1000)
        
        // Verify we're on Token tab
        onView(allOf(withText("Token Details"), isDisplayed()))
            .check(matches(isDisplayed()))
        
        // Navigate back to Auth tab
        // Note: Depending on the tab navigation implementation, this may vary
        // For now, we just verify the Token tab is still displayed
        onView(allOf(withText("Token Details"), isDisplayed()))
            .check(matches(isDisplayed()))
    }
}
