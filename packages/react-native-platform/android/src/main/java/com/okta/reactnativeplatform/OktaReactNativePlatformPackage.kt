package com.okta.reactnativeplatform

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class OktaReactNativePlatformPackage : BaseReactPackage() {
    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
        when (name) {
            TokenStorageModule.NAME -> TokenStorageModule(reactContext)
            BrowserSessionModule.NAME -> BrowserSessionModule(reactContext)
            else -> null
        }

    override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
        mapOf(
            TokenStorageModule.NAME to ReactModuleInfo(
                name = TokenStorageModule.NAME,
                className = "com.okta.reactnativeplatform.TokenStorageModule",
                canOverrideExistingModule = false,
                needsEagerInit = false,
                isCxxModule = false,
                isTurboModule = true
            ),
            BrowserSessionModule.NAME to ReactModuleInfo(
                name = BrowserSessionModule.NAME,
                className = "com.okta.reactnativeplatform.BrowserSessionModule",
                canOverrideExistingModule = false,
                needsEagerInit = false,
                isCxxModule = false,
                isTurboModule = true
            )
        )
    }
}

