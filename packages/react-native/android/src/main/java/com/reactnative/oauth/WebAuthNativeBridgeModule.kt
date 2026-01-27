package com.reactnative.oauth

import android.app.Activity
import android.content.Intent
import android.net.Uri

import androidx.browser.customtabs.CustomTabsIntent
import androidx.browser.customtabs.CustomTabsClient

import com.facebook.react.bridge.*
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.ActivityEventListener

@ReactModule(name = WebAuthNativeBridgeModule.NAME)
class WebAuthNativeBridgeModule(
    val reactContext: ReactApplicationContext
): ReactContextBaseJavaModule(reactContext), ActivityEventListener, LifecycleEventListener {

    companion object {
        const val NAME = "WebAuthNativeBridge"
        const val CHROME_INCOGNITO_EXTRA = "com.google.android.apps.chrome.EXTRA_OPEN_NEW_INCOGNITO_TAB"
    }

    private var pendingPromise: Promise? = null
    private var expectedCallbackScheme: String? = null
    private var expectedCallbackHost: String? = null
    private var expectedCallbackPath: String? = null

    private var awaitingResult: Boolean = false
    private var receivedRedirect: Boolean = false

    init {
        reactContext.addActivityEventListener(this)
        reactContext.addLifecycleEventListener(this)
    }

    override fun getName(): String = NAME

    override fun onNewIntent(intent: Intent) {
       
        val data = intent.data ?: return
        val promise = pendingPromise ?: return
        if(!awaitingResult){
            return
        }

        if(matchesRedirect(data)){
            receivedRedirect = true
            val resultMap = Arguments.createMap().apply {
                putString("type", "success")
                putString("url", data.toString())
            }
            promise.resolve(resultMap)
            clearPending()
        }
    }

    override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {

    }

    override fun onHostResume() {
        val promise = pendingPromise ?: return
        if(!awaitingResult){
            return  
        }

        if(!receivedRedirect){
            val resultMap = Arguments.createMap().apply {
                putString("type", "cancel")
            }
            promise.resolve(resultMap)
            clearPending()
        }
    }

    override fun onHostPause() = Unit

    override fun onHostDestroy() {
        val resultMap = Arguments.createMap().apply {
                putString("type", "dismiss")
            }
        pendingPromise?.resolve(resultMap)
        clearPending()
    }

    private fun clearPending() {
        pendingPromise = null
        expectedCallbackScheme = null
        expectedCallbackHost = null
        expectedCallbackPath = null
        awaitingResult = false
        receivedRedirect = false
    }

    private fun matchesRedirect(uri: Uri): Boolean {
        val schemeOk = uri.scheme == expectedCallbackScheme
        if(!schemeOk){
            return false
        }
        
        expectedCallbackHost?.let { host ->
            if(host.isNotEmpty() && uri.host != host){
                return false
            }
        }

        expectedCallbackPath?.let { path ->
            if(path.isNotEmpty() && uri.path != path){
                return false
            }
        }

        return true
    }


    @ReactMethod
    fun openAuthSessionAsync(
        authorizationUrl: String,
        redirectUri: String,
        preferedEphemeral: Boolean,
        promise: Promise
    ){

        if(pendingPromise != null){
            val resultMap = Arguments.createMap().apply {
                putString("type", "locked")
            }
            promise.resolve(resultMap)
            return
        }

        val activity = reactContext.currentActivity
        if(activity == null){
            promise.reject("E_NO_ACTIVITY", "No current Activity to launch Custom Tabs")
            return
        }

        val browserPackage = CustomTabsClient.getPackageName(activity, null)
        if(browserPackage == null){
            val resultMap = Arguments.createMap().apply {
                putString("type", "browser_unavailable")
            }
            promise.resolve(resultMap)
            return
        }

        val authUri = try {
            Uri.parse(authorizationUrl)
        } catch (e: Exception) {
            promise.reject("E_INVALID_AUTH_URL", "Invalid authorizationUrl", e)
            return
        }

        val callbackUri = try {
            Uri.parse(redirectUri)
        } catch (e: Exception) {
            promise.reject("E_INVALID_REDIRECT_URI", "Invalid redirectUri", e)
            return
        }

        val scheme = callbackUri.scheme
        if(scheme.isNullOrBlank()){
            promise.reject("E_INVALID_REDIRECT_URI", "redirectUri must have a valid scheme")
            return
        }

        pendingPromise = promise
        expectedCallbackScheme = scheme
        expectedCallbackHost = callbackUri.host
        expectedCallbackPath = callbackUri.path
        receivedRedirect = false
        awaitingResult = true

        try {
            val builder = CustomTabsIntent.Builder()
            val customTabsIntent = builder.build()

            if (preferedEphemeral) {
                customTabsIntent.intent.putExtra(CHROME_INCOGNITO_EXTRA, true)
            }

            customTabsIntent.launchUrl(activity, authUri)
        } catch (e: Exception) {
            clearPending()
            promise.reject("E_LAUNCH_FAILED", e.message, e)
        }
    }
    
}