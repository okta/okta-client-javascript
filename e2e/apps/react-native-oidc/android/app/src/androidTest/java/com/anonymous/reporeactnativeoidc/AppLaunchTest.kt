package com.anonymous.reporeactnativeoidc

import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.action.ViewActions.click
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.*
import androidx.test.ext.junit.rules.ActivityScenarioRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.hamcrest.Matchers.allOf
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Espresso-only tests for app initialization and OAuth button availability.
 * These tests verify the app can launch and the OAuth flow can be initiated.
 * Full OAuth flow is tested in OAuthLoginTest with UIAutomator.
 */
@RunWith(AndroidJUnit4::class)
class AppLaunchTest {

    @get:Rule
    val activityRule = ActivityScenarioRule(MainActivity::class.java)

    /**
     * Test that the OAuth button is available for user interaction.
     * This is the entry point to the actual authentication flow.
     * 
     * Uses contentDescription matcher which maps to React Native's accessibilityLabel prop.
     */
    @Test
    fun authenticationScreen_OAuthButtonIsAvailable() {
        Thread.sleep(2000)

        // Verify the OAuth "Request Token" button exists and is displayed
        // This button initiates the authentication flow
        // Match by contentDescription (maps to accessibilityLabel in React Native)
        onView(
            allOf(
                withContentDescription("requestTokenButton"),
                isDisplayed()
            )
        ).check(matches(isDisplayed()))
    }

    /**
     * Test that the Sign Out button is available (for post-auth cleanup).
     */
    @Test
    fun authenticationScreen_SignOutButtonIsAvailable() {
        Thread.sleep(2000)

        // Match by contentDescription (maps to accessibilityLabel in React Native)
        onView(
            allOf(
                withContentDescription("signOutButton"),
                isDisplayed()
            )
        ).check(matches(isDisplayed()))
    }
}
