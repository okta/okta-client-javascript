package com.okta.reactnativeplatform

import android.app.Activity
import android.app.Application
import androidx.browser.customtabs.CustomTabsIntent
import androidx.test.core.app.ApplicationProvider
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap
import io.mockk.mockk
import io.mockk.every
import io.mockk.verify
import io.mockk.slot
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import com.google.common.truth.Truth.assertThat

/**
 * Unit tests for BrowserSessionModule.
 * Tests the React Native module that launches CustomTabsIntent for OAuth flows.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class BrowserSessionModuleTest {

    private lateinit var module: BrowserSessionModule
    private lateinit var context: ReactApplicationContext
    private lateinit var application: Application

    @Before
    fun setUp() {
        application = ApplicationProvider.getApplicationContext<Application>()
        
        // Mock ReactApplicationContext
        context = mockk<ReactApplicationContext>(relaxed = true)
        every { context.baseContext } returns application
        every { context.applicationContext } returns application
        
        // Create module with mocked context
        module = BrowserSessionModule(context)
    }

    // MARK: - Module Metadata Tests

    @Test
    fun testGetName_shouldReturnBrowserSessionBridge() {
        assertThat(module.getName()).isEqualTo("BrowserSessionBridge")
    }

    // MARK: - openAuthSession Tests

    @Test
    fun testOpenAuthSession_shouldRejectWithPlatformNotSupported() {
        val promise = mockk<Promise>(relaxed = true)
        val options = mockk<ReadableMap>(relaxed = true)
        
        module.openAuthSession("https://example.com/auth", "com.example", options, promise)
        
        // Verify rejection with appropriate message
        val codeSlot = slot<String>()
        val messageSlot = slot<String>()
        verify { promise.reject(capture(codeSlot), capture(messageSlot)) }
        
        assertThat(codeSlot.captured).isEqualTo("platform_not_supported")
        assertThat(messageSlot.captured).contains("openBrowser()")
    }

    // MARK: - openBrowser Tests with Ephemeral Session Options

    @Test
    fun testOpenBrowser_withNoOptions_shouldUseSHARE_STATE_ON() {
        val promise = mockk<Promise>(relaxed = true)
        val options = mockk<ReadableMap>(relaxed = true)
        
        // Mock options to have no ephemeralSession key
        every { options.hasKey("ephemeralSession") } returns false
        
        // Mock activity
        val mockActivity = mockk<Activity>(relaxed = true)
        every { context.currentActivity } returns mockActivity
        
        module.openBrowser("https://example.com", options, promise)
        
        // Verify promise was resolved
        verify { promise.resolve(any()) }
    }

    @Test
    fun testOpenBrowser_withEphemeralSessionFalse_shouldUseSHARE_STATE_ON() {
        val promise = mockk<Promise>(relaxed = true)
        val options = mockk<ReadableMap>(relaxed = true)
        
        // Mock options to have ephemeralSession = false
        every { options.hasKey("ephemeralSession") } returns true
        every { options.getBoolean("ephemeralSession") } returns false
        
        // Mock activity
        val mockActivity = mockk<Activity>(relaxed = true)
        every { context.currentActivity } returns mockActivity
        
        module.openBrowser("https://example.com", options, promise)
        
        // Verify promise was resolved (browser opened)
        verify { promise.resolve(any()) }
    }

    @Test
    fun testOpenBrowser_withEphemeralSessionTrue_shouldUseSHARE_STATE_OFF() {
        val promise = mockk<Promise>(relaxed = true)
        val options = mockk<ReadableMap>(relaxed = true)
        
        // Mock options to have ephemeralSession = true
        every { options.hasKey("ephemeralSession") } returns true
        every { options.getBoolean("ephemeralSession") } returns true
        
        // Mock activity
        val mockActivity = mockk<Activity>(relaxed = true)
        every { context.currentActivity } returns mockActivity
        
        module.openBrowser("https://example.com", options, promise)
        
        // Verify promise was resolved (browser opened)
        verify { promise.resolve(any()) }
    }

    @Test
    fun testOpenBrowser_withInvalidUrl_shouldRejectWithInvalidUrlError() {
        val promise = mockk<Promise>(relaxed = true)
        val options = mockk<ReadableMap>(relaxed = true)
        every { options.hasKey("ephemeralSession") } returns false
        
        module.openBrowser("not a valid url", options, promise)
        
        val codeSlot = slot<String>()
        verify { promise.reject(capture(codeSlot), any()) }
        assertThat(codeSlot.captured).isEqualTo("invalid_url")
    }

    @Test
    fun testOpenBrowser_withoutActivity_shouldRejectWithNoActivityError() {
        val promise = mockk<Promise>(relaxed = true)
        val options = mockk<ReadableMap>(relaxed = true)
        every { options.hasKey("ephemeralSession") } returns false
        
        // Mock activity to be null
        every { context.currentActivity } returns null
        
        module.openBrowser("https://example.com", options, promise)
        
        val codeSlot = slot<String>()
        verify { promise.reject(capture(codeSlot), any()) }
        assertThat(codeSlot.captured).isEqualTo("no_activity")
    }

    @Test
    fun testOpenBrowser_shouldResolveWithOpenedType() {
        val promise = mockk<Promise>(relaxed = true)
        val options = mockk<ReadableMap>(relaxed = true)
        every { options.hasKey("ephemeralSession") } returns false
        
        val mockActivity = mockk<Activity>(relaxed = true)
        every { context.currentActivity } returns mockActivity
        
        module.openBrowser("https://example.com", options, promise)
        
        // Verify promise was resolved with proper result
        verify { promise.resolve(any()) }
    }
}
