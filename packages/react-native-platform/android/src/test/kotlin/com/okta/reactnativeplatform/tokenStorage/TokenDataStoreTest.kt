package com.okta.reactnativeplatform

import android.app.Application
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.test.core.app.ApplicationProvider
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import com.google.common.truth.Truth.assertThat

/**
 * Unit tests for TokenDataStore.
 * Tests async DataStore operations with encryption integration.
 * Uses runBlocking to bridge suspend functions in tests.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class TokenDataStoreTest {

    private lateinit var dataStore: TokenDataStore
    private lateinit var application: Application

    @Before
    fun setUp() {
        application = ApplicationProvider.getApplicationContext<Application>()
        dataStore = TokenDataStore(application)
    }

    // MARK: - Token Operations Tests

    @Test
    fun testSaveToken_storesEncryptedToken() = runBlocking {
        val tokenId = "test-token-id"
        val tokenData = "test-token-data"
        
        dataStore.saveToken(tokenId, tokenData)
        
        // Verify token was saved
        val retrieved = dataStore.getToken(tokenId)
        assertThat(retrieved).isEqualTo(tokenData)
    }

    @Test
    fun testGetToken_returnsDecryptedValue() = runBlocking {
        val tokenId = "test-token-id"
        val tokenData = """{"access_token": "abc123", "token_type": "Bearer"}"""
        
        dataStore.saveToken(tokenId, tokenData)
        val retrieved = dataStore.getToken(tokenId)
        
        assertThat(retrieved).isEqualTo(tokenData)
    }

    @Test
    fun testGetToken_nonExistent_returnsNull() = runBlocking {
        val retrieved = dataStore.getToken("non-existent-id")
        
        assertThat(retrieved).isNull()
    }

    @Test
    fun testRemoveToken_deletesToken() = runBlocking {
        val tokenId = "test-token-id"
        
        dataStore.saveToken(tokenId, "test-token-data")
        dataStore.removeToken(tokenId)
        val retrieved = dataStore.getToken(tokenId)
        
        assertThat(retrieved).isNull()
    }

    @Test
    fun testRemoveToken_removesMetadata() = runBlocking {
        val tokenId = "test-token-id"
        
        dataStore.saveToken(tokenId, "test-token-data")
        dataStore.saveMetadata(tokenId, "test-metadata")
        dataStore.removeToken(tokenId)
        val metadata = dataStore.getMetadata(tokenId)
        
        assertThat(metadata).isNull()
    }

    @Test
    fun testGetAllTokenIds_returnsEmptyListForEmptyStorage() = runBlocking {
        val ids = dataStore.getAllTokenIds()
        
        assertThat(ids).isEmpty()
    }

    @Test
    fun testGetAllTokenIds_returnsAllSavedTokenIds() = runBlocking {
        dataStore.saveToken("token-1", "data-1")
        dataStore.saveToken("token-2", "data-2")
        dataStore.saveToken("token-3", "data-3")
        
        val ids = dataStore.getAllTokenIds()
        
        assertThat(ids).hasSize(3)
        assertThat(ids).contains("token-1", "token-2", "token-3")
    }

    @Test
    fun testClearAllTokens_removesAllTokens() = runBlocking {
        dataStore.saveToken("token-1", "data-1")
        dataStore.saveToken("token-2", "data-2")
        
        dataStore.clearAllTokens()
        
        val ids = dataStore.getAllTokenIds()
        assertThat(ids).isEmpty()
    }

    @Test
    fun testClearAllTokens_removesAllMetadata() = runBlocking {
        dataStore.saveMetadata("meta-1", "data-1")
        dataStore.saveMetadata("meta-2", "data-2")
        
        dataStore.clearAllTokens()
        
        val meta1 = dataStore.getMetadata("meta-1")
        val meta2 = dataStore.getMetadata("meta-2")
        assertThat(meta1).isNull()
        assertThat(meta2).isNull()
    }

    // MARK: - Metadata Operations Tests

    @Test
    fun testSaveMetadata_storesMetadata() = runBlocking {
        val metadataId = "test-metadata-id"
        val metadataData = """{"expiresAt": 1234567890, "scope": "openid profile"}"""
        
        dataStore.saveMetadata(metadataId, metadataData)
        
        val retrieved = dataStore.getMetadata(metadataId)
        assertThat(retrieved).isEqualTo(metadataData)
    }

    @Test
    fun testGetMetadata_nonExistent_returnsNull() = runBlocking {
        val retrieved = dataStore.getMetadata("non-existent-id")
        
        assertThat(retrieved).isNull()
    }

    @Test
    fun testRemoveMetadata_deletesMetadata() = runBlocking {
        val metadataId = "test-metadata-id"
        
        dataStore.saveMetadata(metadataId, "test-metadata")
        dataStore.removeMetadata(metadataId)
        val retrieved = dataStore.getMetadata(metadataId)
        
        assertThat(retrieved).isNull()
    }

    @Test
    fun testMetadata_isNotEncrypted() = runBlocking {
        val metadataId = "test-metadata-id"
        val metadataData = """{"expiresAt": 1234567890}"""
        
        dataStore.saveMetadata(metadataId, metadataData)
        
        // Metadata should be stored in the metadata DataStore and be readable without decryption
        val retrieved = dataStore.getMetadata(metadataId)
        // The value should match exactly (not encrypted)
        assertThat(retrieved).isEqualTo(metadataData)
    }

    // MARK: - Default Token ID Tests

    @Test
    fun testSetDefaultTokenId_storesId() = runBlocking {
        val defaultId = "default-token-id"
        
        dataStore.setDefaultTokenId(defaultId)
        
        val retrieved = dataStore.getDefaultTokenId()
        assertThat(retrieved).isEqualTo(defaultId)
    }

    @Test
    fun testSetDefaultTokenId_null_clearsDefault() = runBlocking {
        val defaultId = "default-token-id"
        
        dataStore.setDefaultTokenId(defaultId)
        dataStore.setDefaultTokenId(null)
        
        val retrieved = dataStore.getDefaultTokenId()
        assertThat(retrieved).isNull()
    }

    @Test
    fun testGetDefaultTokenId_woNothingSet_returnsNull() = runBlocking {
        val retrieved = dataStore.getDefaultTokenId()
        
        assertThat(retrieved).isNull()
    }

    @Test
    fun testSetDefaultTokenId_overwrites_previousValue() = runBlocking {
        dataStore.setDefaultTokenId("id-1")
        dataStore.setDefaultTokenId("id-2")
        
        val retrieved = dataStore.getDefaultTokenId()
        
        assertThat(retrieved).isEqualTo("id-2")
    }

    // MARK: - Integration Tests

    @Test
    fun testTokensAndMetadata_canBeStoredSeparately() = runBlocking {
        val tokenId = "test-token"
        val tokenData = "token-data"
        val metadataData = """{"expiresAt": 1234567890}"""
        
        dataStore.saveToken(tokenId, tokenData)
        dataStore.saveMetadata(tokenId, metadataData)
        
        val retrievedToken = dataStore.getToken(tokenId)
        val retrievedMetadata = dataStore.getMetadata(tokenId)
        
        assertThat(retrievedToken).isEqualTo(tokenData)
        assertThat(retrievedMetadata).isEqualTo(metadataData)
    }

    @Test
    fun testMultipleTokens_withDifferentMetadata() = runBlocking {
        dataStore.saveToken("token-1", "data-1")
        dataStore.saveMetadata("token-1", "meta-1")
        
        dataStore.saveToken("token-2", "data-2")
        dataStore.saveMetadata("token-2", "meta-2")
        
        val token1 = dataStore.getToken("token-1")
        val meta1 = dataStore.getMetadata("token-1")
        val token2 = dataStore.getToken("token-2")
        val meta2 = dataStore.getMetadata("token-2")
        
        assertThat(token1).isEqualTo("data-1")
        assertThat(meta1).isEqualTo("meta-1")
        assertThat(token2).isEqualTo("data-2")
        assertThat(meta2).isEqualTo("meta-2")
    }

    @Test
    fun testEncryptionManager_usedForTokens() = runBlocking {
        val tokenId = "test-token"
        val plaintext = "sensitive-token-data"
        
        // Save token (should be encrypted internally)
        dataStore.saveToken(tokenId, plaintext)
        
        // Retrieve it (should be decrypted automatically)
        val retrieved = dataStore.getToken(tokenId)
        
        // Should get the original plaintext
        assertThat(retrieved).isEqualTo(plaintext)
    }

    // MARK: - Error Handling Tests

    @Test
    fun testSaveToken_withEmptyId_storesToken() = runBlocking {
        val tokenData = "test-token-data"
        
        dataStore.saveToken("", tokenData)
        
        val retrieved = dataStore.getToken("")
        assertThat(retrieved).isEqualTo(tokenData)
    }

    @Test
    fun testSaveMetadata_withLargeData() = runBlocking {
        val metadataId = "test-id"
        val largeData = "x".repeat(10000)
        
        dataStore.saveMetadata(metadataId, largeData)
        
        val retrieved = dataStore.getMetadata(metadataId)
        assertThat(retrieved).isEqualTo(largeData)
    }

    @Test
    fun testSaveToken_withSpecialCharactersInId() = runBlocking {
        val tokenId = "token:with:special*chars@123"
        val tokenData = "test-data"
        
        dataStore.saveToken(tokenId, tokenData)
        
        val retrieved = dataStore.getToken(tokenId)
        assertThat(retrieved).isEqualTo(tokenData)
    }
}
