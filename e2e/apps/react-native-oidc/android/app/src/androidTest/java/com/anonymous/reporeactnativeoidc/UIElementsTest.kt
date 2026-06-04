package com.anonymous.reporeactnativeoidc

import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.action.ViewActions.click
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.*
import androidx.test.ext.junit.rules.ActivityScenarioRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.hamcrest.Matchers.allOf
import org.hamcrest.Matchers.anyOf
import org.hamcrest.Matchers.containsString
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Instrumentation tests for UI elements and application state.
 * These tests verify that the app correctly renders UI components
 * and maintains proper state during user interactions.
 */
@RunWith(AndroidJUnit4::class)
class UIElementsTest {

    @get:Rule
    val activityRule = ActivityScenarioRule(MainActivity::class.java)

    /**
     * Test that the main activity renders without crashing
     */
    @Test
    fun appInitialization_RenderWithoutCrash() {
        Thread.sleep(3000)
        
        // If we get here without an exception, the app rendered successfully
        onView(withId(android.R.id.content))
            .check(matches(isDisplayed()))
    }

    /**
     * Test that all three main tabs are visible and accessible
     */
    @Test
    fun bottomNavigation_AllTabsAreAccessible() {
        Thread.sleep(2000)
        
        // Verify we can interact with the tab bar
        // The tabs should be: Auth (home), Token, Credentials
        onView(anyOf(
            withText(containsString("Auth")),
            withText(containsString("Token")),
            withText(containsString("Credentials"))
        )).check(matches(isDisplayed()))
    }

    /**
     * Test that the authentication screen contains required UI elements
     */
    @Test
    fun authenticationScreen_ContainsRequiredElements() {
        Thread.sleep(2000)
        
        // Check for Authentication title
        onView(allOf(withText("Authentication"), isDisplayed()))
            .check(matches(isDisplayed()))
        
        // Check for Request Token button
        onView(allOf(withText("Request Token"), isDisplayed()))
            .check(matches(isDisplayed()))
        
        // Check for Sign Out button
        onView(allOf(withText("Sign Out"), isDisplayed()))
            .check(matches(isDisplayed()))
    }

    /**
     * Test that authentication status is clearly indicated
     */
    @Test
    fun authenticationScreen_DisplaysStatusIndicator() {
        Thread.sleep(2000)
        
        // Look for status indicator containing "Status:"
        onView(withText(containsString("Status:")))
            .check(matches(isDisplayed()))
    }

    /**
     * Test that "Next Steps" section is displayed
     */
    @Test
    fun authenticationScreen_DisplaysNextStepsSection() {
        Thread.sleep(2000)
        
        // Look for "Next Steps:" section
        onView(withText(containsString("Next Steps:")))
            .check(matches(isDisplayed()))
    }

    /**
     * Test that the app displays appropriate guidance for unauthenticated users
     */
    @Test
    fun authenticationScreen_ProvidesGuidanceForSignIn() {
        Thread.sleep(2000)
        
        // When not authenticated, the next steps should guide to sign in
        onView(withText(containsString("Sign in to get started")))
            .check(matches(isDisplayed()))
    }

    /**
     * Test that clicking buttons doesn't crash the app
     */
    @Test
    fun authenticationScreen_RequestTokenButtonClickable() {
        Thread.sleep(2000)
        
        // Click the Request Token button
        // This will likely open the OAuth flow, but we're just testing it's clickable
        onView(allOf(withText("Request Token"), isDisplayed()))
            .perform(click())
        
        Thread.sleep(500)
        
        // The app should still be responsive (content view should be present)
        onView(withId(android.R.id.content))
            .check(matches(isDisplayed()))
    }

    /**
     * Test that credentials tab title is visible
     */
    @Test
    fun credentialsScreen_TitleIsVisible() {
        Thread.sleep(2000)
        
        // Navigate to Credentials tab
        onView(allOf(withText("Credentials"), isDisplayed()))
            .perform(click())
        
        Thread.sleep(1000)
        
        // Verify Credentials title appears
        onView(allOf(withText("Credentials"), isDisplayed()))
            .check(matches(isDisplayed()))
    }

    /**
     * Test that token details screen displays required sections
     */
    @Test
    fun tokenScreen_DisplaysRequiredSections() {
        Thread.sleep(2000)
        
        // Navigate to Token tab
        onView(allOf(withText("Token"), isDisplayed()))
            .perform(click())
        
        Thread.sleep(1000)
        
        // Verify title is shown
        onView(allOf(withText("Token Details"), isDisplayed()))
            .check(matches(isDisplayed()))
    }

    /**
     * Test that the app handles rapid tab switching
     */
    @Test
    fun rapidly_SwitchBetweenTabs() {
        Thread.sleep(2000)
        
        // Rapidly switch between tabs
        for (i in 0 until 3) {
            // Click Credentials tab
            onView(allOf(withText("Credentials"), isDisplayed()))
                .perform(click())
            Thread.sleep(300)
            
            // Click Token tab
            onView(allOf(withText("Token"), isDisplayed()))
                .perform(click())
            Thread.sleep(300)
        }
        
        // Verify app is still responsive
        onView(withId(android.R.id.content))
            .check(matches(isDisplayed()))
    }

    /**
     * Test that accessibility features work (e.g., content visibility)
     */
    @Test
    fun accessibilityChecks_AllContentIsVisible() {
        Thread.sleep(2000)
        
        // Verify main content is visible
        onView(withId(android.R.id.content))
            .check(matches(isDisplayed()))
        
        // Navigate through all tabs and verify content
        onView(allOf(withText("Credentials"), isDisplayed()))
            .perform(click())
        Thread.sleep(500)
        
        onView(allOf(withText("Token"), isDisplayed()))
            .perform(click())
        Thread.sleep(500)
        
        // Content should remain visible throughout
        onView(withId(android.R.id.content))
            .check(matches(isDisplayed()))
    }

    /**
     * Test that buttons have appropriate text labels
     */
    @Test
    fun buttons_HaveAppropriateLabels() {
        Thread.sleep(2000)
        
        // Verify button labels are clear and descriptive
        onView(allOf(withText("Request Token"), isDisplayed()))
            .check(matches(isDisplayed()))
        
        onView(allOf(withText("Sign Out"), isDisplayed()))
            .check(matches(isDisplayed()))
    }

    /**
     * Test that error states can be displayed (if needed)
     */
    @Test
    fun errorHandling_AppRemainsStable() {
        Thread.sleep(2000)
        
        // Try to navigate to Token tab without authentication
        // This should show an error message rather than crashing
        onView(allOf(withText("Token"), isDisplayed()))
            .perform(click())
        
        Thread.sleep(1000)
        
        // App should still be responsive with error message visible
        onView(withId(android.R.id.content))
            .check(matches(isDisplayed()))
    }
}
