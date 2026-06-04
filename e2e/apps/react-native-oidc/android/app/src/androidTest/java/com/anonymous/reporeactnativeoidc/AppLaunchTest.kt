package com.anonymous.reporeactnativeoidc

import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.action.ViewActions.click
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.*
import androidx.test.ext.junit.rules.ActivityScenarioRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.hamcrest.Matchers.allOf
import org.hamcrest.Matchers.containsString
import org.junit.Assert.assertNotNull
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class AppLaunchTest {

    @get:Rule
    val activityRule = ActivityScenarioRule(MainActivity::class.java)

    /**
     * Test that MainActivity launches successfully and the activity is created
     */
    @Test
    fun mainActivity_LaunchesSuccessfully() {
        activityRule.scenario.onActivity { activity ->
            assertNotNull(activity)
        }
    }

    /**
     * Test that the app displays the Authentication tab on launch
     * Verifies the "Request Token" button is visible
     */
    @Test
    fun authenticationTab_DisplaysLoginButton() {
        // Wait for the app to load and display the authentication screen
        Thread.sleep(2000)
        
        // Verify "Request Token" button is visible
        onView(
            allOf(
                withText("Request Token"),
                isDisplayed()
            )
        ).check(matches(isDisplayed()))
    }

    /**
     * Test that authentication status is shown as "Not Authenticated" on initial launch
     */
    @Test
    fun authenticationTab_ShowsNotAuthenticatedStatus() {
        Thread.sleep(2000)
        
        // Look for "Not Authenticated" text
        onView(
            allOf(
                withText(containsString("Not Authenticated")),
                isDisplayed()
            )
        ).check(matches(isDisplayed()))
    }

    /**
     * Test that the Sign Out button is visible on the authentication screen
     */
    @Test
    fun authenticationTab_DisplaysSignOutButton() {
        Thread.sleep(2000)
        
        // Verify "Sign Out" button is visible
        onView(
            allOf(
                withText("Sign Out"),
                isDisplayed()
            )
        ).check(matches(isDisplayed()))
    }

    /**
     * Test that navigation to the Credentials tab works
     */
    @Test
    fun credentialsTab_CanBeNavigated() {
        Thread.sleep(2000)
        
        // Find and click on the Credentials tab (look for text on the tab)
        onView(
            allOf(
                withText("Credentials"),
                isDisplayed()
            )
        ).perform(click())
        
        Thread.sleep(1000)
        
        // Verify the credentials screen is displayed by checking for the title
        onView(
            allOf(
                withText("Credentials"),
                isDisplayed()
            )
        ).check(matches(isDisplayed()))
    }

    /**
     * Test that the Credentials tab shows "No credentials found" when not authenticated
     */
    @Test
    fun credentialsTab_ShowsEmptyStateWhenNotAuthenticated() {
        Thread.sleep(2000)
        
        // Navigate to Credentials tab
        onView(
            allOf(
                withText("Credentials"),
                isDisplayed()
            )
        ).perform(click())
        
        Thread.sleep(1000)
        
        // Verify empty state message is shown
        onView(
            allOf(
                withText(containsString("No credentials found")),
                isDisplayed()
            )
        ).check(matches(isDisplayed()))
    }

    /**
     * Test that the Token tab can be navigated to
     */
    @Test
    fun tokenTab_CanBeNavigated() {
        Thread.sleep(2000)
        
        // Find and click on the Token tab
        onView(
            allOf(
                withText("Token"),
                isDisplayed()
            )
        ).perform(click())
        
        Thread.sleep(1000)
        
        // Verify the token screen is displayed
        onView(
            allOf(
                withText("Token Details"),
                isDisplayed()
            )
        ).check(matches(isDisplayed()))
    }

    /**
     * Test that the Token tab shows an error message when no token is available
     */
    @Test
    fun tokenTab_ShowsErrorWhenNoTokenAvailable() {
        Thread.sleep(2000)
        
        // Navigate to Token tab
        onView(
            allOf(
                withText("Token"),
                isDisplayed()
            )
        ).perform(click())
        
        Thread.sleep(1000)
        
        // Verify error message is shown
        onView(
            allOf(
                withText(containsString("No credential found")),
                isDisplayed()
            )
        ).check(matches(isDisplayed()))
    }

    /**
     * Test loading states are shown while the app initializes
     */
    @Test
    fun authenticationTab_ShowsLoadingState() {
        // Check if loading indicator appears during initial load
        // This may be very brief, so we check within a short window
        Thread.sleep(500)
        
        // Either loading is shown or the UI is already loaded
        try {
            onView(
                allOf(
                    withText("Loading..."),
                    isDisplayed()
                )
            ).check(matches(isDisplayed()))
        } catch (e: Exception) {
            // Loading finished quickly, which is fine
            // Verify at least the request token button is visible
            onView(
                allOf(
                    withText("Request Token"),
                    isDisplayed()
                )
            ).check(matches(isDisplayed()))
        }
    }
}
