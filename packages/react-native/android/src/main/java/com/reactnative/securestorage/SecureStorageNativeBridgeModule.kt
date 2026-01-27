package com.reactnative.securestorage

import android.content.Context
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

class SecureStorageNativeBridgeModule(
    private val reactContext: ReactApplicationContext
): ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "SecureStorageNativeBridge"

    private val prefs by lazy {
        val masterKey = MasterKey.Builder(reactContext)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()


        EncryptedSharedPreferences.create(
            reactContext,
            "okta_secure_storage",
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }

    @ReactMethod
    fun getItem(key: String, promise: Promise){
        try {
            val value: String? = prefs.getString(key, null)
            promise.resolve(value) 
        } catch(e: Exception){
            promise.reject("E_GET", "SecureStorage getItem failed: ${e.message}", e)
        }
    }

    @ReactMethod
    fun setItem(key: String, value: String, promise: Promise){
        try {
            prefs.edit().putString(key, value).apply()
            promise.resolve(null) 
        } catch(e: Exception){
            promise.reject("E_SET", "SecureStorage setItem failed: ${e.message}", e)
        }
    }

    @ReactMethod
    fun removeItem(key: String, promise: Promise){
        try {
            prefs.edit().remove(key).apply()
            promise.resolve(null) 
        } catch(e: Exception){
            promise.reject("E_REMOVE", "SecureStorage removeItem failed: ${e.message}", e)
        }
    }

    @ReactMethod
    fun clear(promise: Promise){
        try {
            prefs.edit().clear().apply()
            promise.resolve(null) 
        } catch(e: Exception){
            promise.reject("E_CLEAR", "SecureStorage clear failed: ${e.message}", e)
        }
    }

}