package com.reactnative

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

import com.reactnative.webcrypto.WebCryptoNativeBridgeModule
import com.reactnative.securestorage.SecureStorageNativeBridgeModule
import com.reactnative.oauth.WebAuthNativeBridgeModule

class OktaReactNativePackage: ReactPackage{
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(
            WebCryptoNativeBridgeModule(reactContext),
            SecureStorageNativeBridgeModule(reactContext),
            WebAuthNativeBridgeModule(reactContext)
        )
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
            return emptyList()
    }
}