package com.reactnative

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

import com.reactnative.webcrypto.WebCryptoNativeBridgeModule
import com.reactnative.securestorage.SecureStorageNativeBridgeModule

class OktaReactNativePackage: ReactPackage{
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(
            WebCryptoNativeBridgeModule(reactContext),
            SecureStorageNativeBridgeModule(reactContext),
        )
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
            return emptyList()
    }
}