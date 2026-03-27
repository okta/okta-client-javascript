package com.okta.reactnativeplatform

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.facebook.react.bridge.*
import com.facebook.react.module.annotations.ReactModule

@ReactModule(name = TokenStorageModule.NAME)
class TokenStorageModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
       const val NAME = "TokenStorageBridge"
        private const val PREFS_TOKENS = "okta_tokens"
        private const val PREFS_METADATA = "okta_metadata"
        private const val DEFAULT_TOKEN_KEY = "okta-default-token"
    }

    override fun getName(): String = NAME

    private val masterKey: MasterKey? by lazy {
        try {
            MasterKey.Builder(reactContext)
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build()
        } catch (e: Exception) {
            // KeyStore may not be available in test environments
            null
        }
    }

    // Secure storage for tokens (lazy initialized)
    private val securePrefs: SharedPreferences by lazy {
        val mk = masterKey
        if (mk != null) {
            try {
                EncryptedSharedPreferences.create(
                    reactContext,
                    PREFS_TOKENS,
                    mk,
                    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
                )
            } catch (e: Exception) {
                // Fall back to unencrypted storage if encryption fails (e.g., in tests)
                reactContext.getSharedPreferences(PREFS_TOKENS, Context.MODE_PRIVATE)
            }
        } else {
            // Use unencrypted storage if KeyStore is unavailable
            reactContext.getSharedPreferences(PREFS_TOKENS, Context.MODE_PRIVATE)
        }
    }

    // Regular storage for metadata
    private val metadataPrefs: SharedPreferences by lazy {
        reactContext.getSharedPreferences(
            PREFS_METADATA,
            Context.MODE_PRIVATE
        )
    }

    // MARK: - Token Operations (Secure Storage)

    @ReactMethod
    fun saveToken(id: String, tokenData: String, promise: Promise) {
        try {
            securePrefs.edit().putString(id, tokenData).apply()
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("token_save_error", "Failed to save token", e)
        }
    }

    @ReactMethod
    fun getToken(id: String, promise: Promise) {
        try {
            val value = securePrefs.getString(id, null)
            promise.resolve(value)
        } catch (e: Exception) {
            promise.resolve(null)
        }
    }

    @ReactMethod
    fun removeToken(id: String, promise: Promise) {
        try {
            securePrefs.edit().remove(id).apply()
            metadataPrefs.edit().remove(id).apply()
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("token_remove_error", "Failed to remove token", e)
        }
    }

    @ReactMethod
    fun getAllTokenIds(promise: Promise) {
        try {
            val keys = securePrefs.all.keys.toList()
            val array = Arguments.createArray()
            keys.forEach { array.pushString(it) }
            promise.resolve(array)
        } catch (e: Exception) {
            promise.reject("token_list_error", "Failed to get token IDs", e)
        }
    }

    @ReactMethod
    fun clearTokens(promise: Promise) {
        try {
            securePrefs.edit().clear().apply()
            metadataPrefs.edit().clear().apply()
            metadataPrefs.edit().remove(DEFAULT_TOKEN_KEY).apply()
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("token_clear_error", "Failed to clear tokens", e)
        }
    }

    // MARK: - Metadata Operations (Regular Storage)

    @ReactMethod
    fun saveMetadata(id: String, metadataData: String, promise: Promise) {
        try {
            metadataPrefs.edit().putString(id, metadataData).apply()
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("metadata_save_error", "Failed to save metadata", e)
        }
    }

    @ReactMethod
    fun getMetadata(id: String, promise: Promise) {
        try {
            val value = metadataPrefs.getString(id, null)
            promise.resolve(value)
        } catch (e: Exception) {
            promise.resolve(null)
        }
    }

    @ReactMethod
    fun removeMetadata(id: String, promise: Promise) {
        try {
            metadataPrefs.edit().remove(id).apply()
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("metadata_remove_error", "Failed to remove metadata", e)
        }
    }

    // MARK: - Default Token ID

    @ReactMethod
    fun setDefaultTokenId(id: String?, promise: Promise) {
        try {
            if (id != null) {
                metadataPrefs.edit().putString(DEFAULT_TOKEN_KEY, id).apply()
            } else {
                metadataPrefs.edit().remove(DEFAULT_TOKEN_KEY).apply()
            }
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("default_token_error", "Failed to set default token ID", e)
        }
    }

    @ReactMethod
    fun getDefaultTokenId(promise: Promise) {
        try {
            val value = metadataPrefs.getString(DEFAULT_TOKEN_KEY, null)
            promise.resolve(value)
        } catch (e: Exception) {
            promise.resolve(null)
        }
    }
}