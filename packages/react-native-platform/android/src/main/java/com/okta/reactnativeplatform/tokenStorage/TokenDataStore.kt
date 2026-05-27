package com.okta.reactnativeplatform

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.first

/**
 * Secure token storage using DataStore with AES-256-GCM encryption.
 *
 * Tokens are encrypted before storage using EncryptionManager.
 * Metadata is stored separately and remains unencrypted (no sensitive data).
 *
 * All operations are suspend functions - intended to be called from EncryptionManager's CoroutineScope.
 */
class TokenDataStore(private val context: Context) {
    private val encryptionManager = EncryptionManager()

    // DataStore instances
    private val Context.tokenDataStore: DataStore<Preferences> by preferencesDataStore(
        name = "okta_tokens_encrypted"
    )

    private val Context.metadataDataStore: DataStore<Preferences> by preferencesDataStore(
        name = "okta_metadata"
    )

    /**
     * Saves an encrypted token to DataStore.
     *
     * @param id Token ID
     * @param tokenData Token data (plaintext)
     * @throws Exception if encryption or storage fails
     */
    suspend fun saveToken(id: String, tokenData: String) {
        try {
            val encryptedData = encryptionManager.encryptString(tokenData)
            val key = stringPreferencesKey(id)
            
            context.tokenDataStore.edit { preferences ->
                preferences[key] = encryptedData
            }
        } catch (e: Exception) {
            throw Exception("Failed to save token '$id': ${e.message}", e)
        }
    }

    /**
     * Retrieves and decrypts a token from DataStore.
     *
     * @param id Token ID
     * @return Decrypted token data, or null if not found
     * @throws Exception if decryption fails
     */
    suspend fun getToken(id: String): String? {
        return try {
            val key = stringPreferencesKey(id)
            val preferences = context.tokenDataStore.data.first()
            val encryptedData = preferences[key]
            
            encryptedData?.let { encryptionManager.decryptString(it) }
        } catch (e: Exception) {
            throw Exception("Failed to retrieve token '$id': ${e.message}", e)
        }
    }

    /**
     * Removes a token and its metadata from DataStore.
     *
     * @param id Token ID
     * @throws Exception if operation fails
     */
    suspend fun removeToken(id: String) {
        try {
            val tokenKey = stringPreferencesKey(id)
            val metadataKey = stringPreferencesKey(id)
            
            context.tokenDataStore.edit { preferences ->
                preferences.remove(tokenKey)
            }
            
            context.metadataDataStore.edit { preferences ->
                preferences.remove(metadataKey)
            }
        } catch (e: Exception) {
            throw Exception("Failed to remove token '$id': ${e.message}", e)
        }
    }

    /**
     * Retrieves all token IDs currently stored.
     *
     * @return List of token IDs
     * @throws Exception if operation fails
     */
    suspend fun getAllTokenIds(): List<String> {
        return try {
            val preferences = context.tokenDataStore.data.first()
            preferences.asMap().keys.map { it.name }
        } catch (e: Exception) {
            throw Exception("Failed to retrieve token IDs: ${e.message}", e)
        }
    }

    /**
     * Clears all tokens and metadata from DataStore.
     *
     * @throws Exception if operation fails
     */
    suspend fun clearAllTokens() {
        try {
            context.tokenDataStore.edit { preferences ->
                preferences.clear()
            }
            
            context.metadataDataStore.edit { preferences ->
                preferences.clear()
            }
        } catch (e: Exception) {
            throw Exception("Failed to clear tokens: ${e.message}", e)
        }
    }

    // MARK: - Metadata Operations (Unencrypted)

    /**
     * Saves metadata (unencrypted) to DataStore.
     *
     * @param id Metadata ID
     * @param metadataData Metadata JSON string
     * @throws Exception if operation fails
     */
    suspend fun saveMetadata(id: String, metadataData: String) {
        try {
            val key = stringPreferencesKey(id)
            context.metadataDataStore.edit { preferences ->
                preferences[key] = metadataData
            }
        } catch (e: Exception) {
            throw Exception("Failed to save metadata '$id': ${e.message}", e)
        }
    }

    /**
     * Retrieves metadata from DataStore.
     *
     * @param id Metadata ID
     * @return Metadata JSON string, or null if not found
     * @throws Exception if operation fails
     */
    suspend fun getMetadata(id: String): String? {
        return try {
            val key = stringPreferencesKey(id)
            val preferences = context.metadataDataStore.data.first()
            preferences[key]
        } catch (e: Exception) {
            throw Exception("Failed to retrieve metadata '$id': ${e.message}", e)
        }
    }

    /**
     * Removes metadata from DataStore.
     *
     * @param id Metadata ID
     * @throws Exception if operation fails
     */
    suspend fun removeMetadata(id: String) {
        try {
            val key = stringPreferencesKey(id)
            context.metadataDataStore.edit { preferences ->
                preferences.remove(key)
            }
        } catch (e: Exception) {
            throw Exception("Failed to remove metadata '$id': ${e.message}", e)
        }
    }

    /**
     * Sets the default token ID in metadata storage.
     *
     * @param id Token ID, or null to clear default
     * @throws Exception if operation fails
     */
    suspend fun setDefaultTokenId(id: String?) {
        try {
            val key = stringPreferencesKey(DEFAULT_TOKEN_KEY)
            context.metadataDataStore.edit { preferences ->
                if (id != null) {
                    preferences[key] = id
                } else {
                    preferences.remove(key)
                }
            }
        } catch (e: Exception) {
            throw Exception("Failed to set default token ID: ${e.message}", e)
        }
    }

    /**
     * Retrieves the default token ID from metadata storage.
     *
     * @return Default token ID, or null if not set
     * @throws Exception if operation fails
     */
    suspend fun getDefaultTokenId(): String? {
        return try {
            val key = stringPreferencesKey(DEFAULT_TOKEN_KEY)
            val preferences = context.metadataDataStore.data.first()
            preferences[key]
        } catch (e: Exception) {
            throw Exception("Failed to retrieve default token ID: ${e.message}", e)
        }
    }

    companion object {
        private const val DEFAULT_TOKEN_KEY = "okta-default-token"
    }
}
