package com.okta.reactnativeplatform

import com.facebook.react.bridge.*
import com.facebook.react.module.annotations.ReactModule
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch

@ReactModule(name = TokenStorageModule.NAME)
class TokenStorageModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "TokenStorageBridge"
    }

    override fun getName(): String = NAME

    // DataStore provider for encrypted token and metadata storage
    private val dataStore = TokenDataStore(reactContext)

    // CoroutineScope for async DataStore operations
    // Uses IO dispatcher to avoid blocking main thread
    // Scope persists for the lifetime of the app (React Native modules are singletons)
    private val scope = CoroutineScope(Dispatchers.IO + Job())

    // MARK: - Token Operations (Secure Storage)

    @ReactMethod
    fun saveToken(id: String, tokenData: String, promise: Promise) {
        scope.launch {
            try {
                dataStore.saveToken(id, tokenData)
                promise.resolve(null)
            } catch (e: Exception) {
                promise.reject("token_save_error", "Failed to save token", e)
            }
        }
    }

    @ReactMethod
    fun getToken(id: String, promise: Promise) {
        scope.launch {
            try {
                val token = dataStore.getToken(id)
                promise.resolve(token)
            } catch (e: Exception) {
                promise.resolve(null)
            }
        }
    }

    @ReactMethod
    fun removeToken(id: String, promise: Promise) {
        scope.launch {
            try {
                dataStore.removeToken(id)
                promise.resolve(null)
            } catch (e: Exception) {
                promise.reject("token_remove_error", "Failed to remove token", e)
            }
        }
    }

    @ReactMethod
    fun getAllTokenIds(promise: Promise) {
        scope.launch {
            try {
                val keys = dataStore.getAllTokenIds()
                val array = Arguments.createArray()
                keys.forEach { array.pushString(it) }
                promise.resolve(array)
            } catch (e: Exception) {
                promise.reject("token_list_error", "Failed to get token IDs", e)
            }
        }
    }

    @ReactMethod
    fun clearTokens(promise: Promise) {
        scope.launch {
            try {
                dataStore.clearAllTokens()
                promise.resolve(null)
            } catch (e: Exception) {
                promise.reject("token_clear_error", "Failed to clear tokens", e)
            }
        }
    }

    // MARK: - Metadata Operations (Regular Storage)

    @ReactMethod
    fun saveMetadata(id: String, metadataData: String, promise: Promise) {
        scope.launch {
            try {
                dataStore.saveMetadata(id, metadataData)
                promise.resolve(null)
            } catch (e: Exception) {
                promise.reject("metadata_save_error", "Failed to save metadata", e)
            }
        }
    }

    @ReactMethod
    fun getMetadata(id: String, promise: Promise) {
        scope.launch {
            try {
                val metadata = dataStore.getMetadata(id)
                promise.resolve(metadata)
            } catch (e: Exception) {
                promise.resolve(null)
            }
        }
    }

    @ReactMethod
    fun removeMetadata(id: String, promise: Promise) {
        scope.launch {
            try {
                dataStore.removeMetadata(id)
                promise.resolve(null)
            } catch (e: Exception) {
                promise.reject("metadata_remove_error", "Failed to remove metadata", e)
            }
        }
    }

    // MARK: - Default Token ID

    @ReactMethod
    fun setDefaultTokenId(id: String?, promise: Promise) {
        scope.launch {
            try {
                dataStore.setDefaultTokenId(id)
                promise.resolve(null)
            } catch (e: Exception) {
                promise.reject("default_token_error", "Failed to set default token ID", e)
            }
        }
    }

    @ReactMethod
    fun getDefaultTokenId(promise: Promise) {
        scope.launch {
            try {
                val id = dataStore.getDefaultTokenId()
                promise.resolve(id)
            } catch (e: Exception) {
                promise.resolve(null)
            }
        }
    }
}