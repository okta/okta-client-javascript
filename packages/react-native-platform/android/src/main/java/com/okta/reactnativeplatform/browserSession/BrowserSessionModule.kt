package com.okta.reactnativeplatform

import android.app.Activity
import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent
import com.facebook.react.bridge.*
import com.facebook.react.module.annotations.ReactModule

/**
 * BrowserSessionModule for opening OAuth flows in native browser
 * Simply launches CustomTabsIntent - OAuth completion is handled via Linking API on JavaScript side
 */
@ReactModule(name = BrowserSessionModule.NAME)
class BrowserSessionModule(reactContext: ReactApplicationContext) :
    NativeBrowserSessionBridgeSpec(reactContext) {

    companion object {
        const val NAME = "BrowserSessionBridge"
    }

    override fun getName(): String = NAME

    @ReactMethod
    override fun openAuthSession(
        url: String,
        redirectScheme: String,
        options: ReadableMap,
        promise: Promise
    ) {
        // Android uses the JavaScript polyfill pattern (openBrowser + Linking API)
        // This method is iOS-only but must be declared for TurboModule compatibility
        promise.reject(
            "platform_not_supported",
            "Use openBrowser() on Android - OAuth completion is handled via JavaScript Linking API"
        )
    }

    @ReactMethod
    override fun openBrowser(
        url: String,
        options: ReadableMap,
        promise: Promise
    ) {
        println("in openBrowser")

        try {
            val uri = Uri.parse(url)
            if (uri.scheme == null || uri.host == null) {
                promise.reject("invalid_url", "Invalid URL provided")
                return
            }

            val activity: Activity? = reactApplicationContext.currentActivity
            if (activity == null) {
                promise.reject("no_activity", "Current activity is not available")
                return
            }

            // Extract ephemeralSession option with default value of false
            val ephemeralSession = if (options.hasKey("ephemeralSession")) {
                options.getBoolean("ephemeralSession")
            } else {
                false
            }

            // Set share state based on ephemeral preference
            // ephemeralSession: true = isolated session (no shared cookies/auth)
            // ephemeralSession: false = shared with browser (uses existing cookies/auth)
            val shareState = if (ephemeralSession) {
                CustomTabsIntent.SHARE_STATE_OFF
            } else {
                CustomTabsIntent.SHARE_STATE_ON
            }

            // Launch in CustomTabsIntent (Chrome/default browser)
            val customTabsIntent = CustomTabsIntent.Builder()
                .setShareState(shareState)
                .build()

            customTabsIntent.launchUrl(activity, uri)

            // Resolve immediately - the browser is now open
            // OAuth result will come via deeplink + Linking API (JavaScript side)
            val result = WritableNativeMap().apply {
                putString("type", "opened")
            }
            promise.resolve(result)

        } catch (e: Exception) {
            promise.reject("browser_session_error", "Failed to launch browser", e)
        }
    }
}

