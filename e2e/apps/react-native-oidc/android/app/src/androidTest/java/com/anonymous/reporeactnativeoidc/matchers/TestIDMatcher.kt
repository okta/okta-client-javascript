package com.anonymous.reporeactnativeoidc.matchers

import android.view.View
import android.widget.Button
import android.widget.TextView
import org.hamcrest.Description
import org.hamcrest.Matcher
import org.hamcrest.TypeSafeMatcher

/**
 * Custom Espresso matcher for React Native testID attributes.
 * React Native stores testID in the view's tag, not in contentDescription.
 * This matcher also handles nested views and various Android view types.
 */
object TestIDMatcher {
    /**
     * Matches a view by its React Native testID
     * 
     * Note: React Native Button components wrap the text in a nested TextView,
     * so this matcher checks multiple properties to find the right view.
     * 
     * @param testID The testID value to match
     * @return A Matcher that matches views with the specified testID
     */
    fun withTestID(testID: String): Matcher<View> {
        return object : TypeSafeMatcher<View>() {
            override fun describeTo(description: Description) {
                description.appendText("with testID: $testID")
            }

            override fun matchesSafely(view: View): Boolean {
                // Check the view's own content description
                // React Native may expose testID through this mechanism
                val contentDesc = view.contentDescription?.toString()
                if (contentDesc == testID) {
                    return true
                }

                // Check the view's tag (React Native may store testID here)
                val viewTag = view.tag
                if (viewTag is String && viewTag == testID) {
                    return true
                }

                // Recursively check children for the testID
                // This handles cases where testID is on a parent of the actual interactive element
                return checkChildrenForTestID(view, testID)
            }

            private fun checkChildrenForTestID(view: View, testID: String): Boolean {
                // Check if this view has the testID
                val tag = view.tag
                if (tag is String && tag == testID) {
                    return true
                }

                // Check content description
                if (view.contentDescription?.toString() == testID) {
                    return true
                }

                // Recursively check parent
                if (view.parent is View) {
                    val parent = view.parent as View
                    val parentTag = parent.tag
                    if (parentTag is String && parentTag == testID) {
                        return true
                    }
                }

                return false
            }
        }
    }
}
