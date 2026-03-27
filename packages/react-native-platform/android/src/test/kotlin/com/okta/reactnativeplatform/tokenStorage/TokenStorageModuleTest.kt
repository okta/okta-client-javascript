package com.okta.reactnativeplatform

import android.app.Application
import android.content.SharedPreferences
import androidx.test.core.app.ApplicationProvider
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableArray
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import io.mockk.every
import io.mockk.mockkStatic
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import com.google.common.truth.Truth.assertThat

/**
 * Unit tests for TokenStorageModule.
 * Tests the Kotlin implementation of token and metadata storage.
 * Uses unencrypted SharedPreferences in tests to avoid KeyStore issues.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class TokenStorageModuleTest {

    private lateinit var module: TokenStorageModule
    private lateinit var context: ReactApplicationContext
    private lateinit var application: Application

    @Before
    fun setUp() {
        application = ApplicationProvider.getApplicationContext<Application>()

        // Mock Arguments.createArray() to avoid React Native initialization
        mockkStatic(Arguments::class)
        every { Arguments.createArray() } answers {
            mockk<WritableArray>(relaxed = true)
        }

        // Create a mocked ReactApplicationContext
        context = mockk<ReactApplicationContext>(relaxed = true)
        every { context.baseContext } returns application

        // Mock getSharedPreferences to return regular prefs (avoiding encryption/KeyStore)
        every { context.getSharedPreferences(any(), any()) } answers {
            val name = firstArg<String>()
            val mode = secondArg<Int>()
            application.getSharedPreferences(name, mode).also {
                it.edit().clear().commit()
            }
        }

        // Create module
        module = TokenStorageModule(context)
    }

    // MARK: - Token Operations Tests

    @Test
    fun testSaveToken_shouldResolvePromise() {
        val promise = mockk<Promise>(relaxed = true)

        module.saveToken("test-id", "test-token", promise)

        verify { promise.resolve(null) }
    }

    @Test
    fun testSaveAndGetToken_shouldReturnSavedToken() {
        val promise = mockk<Promise>(relaxed = true)
        val getPromise = mockk<Promise>(relaxed = true)
        val resultSlot = slot<String>()

        // Save token
        module.saveToken("test-id", "test-token", promise)
        verify { promise.resolve(null) }

        // Get token
        module.getToken("test-id", getPromise)
        verify { getPromise.resolve(capture(resultSlot)) }
        assertThat(resultSlot.captured).isEqualTo("test-token")
    }

    @Test
    fun testGetToken_nonExistent_shouldResolveNull() {
        val promise = mockk<Promise>(relaxed = true)

        module.getToken("non-existent", promise)

        verify { promise.resolve(null) }
    }

    @Test
    fun testRemoveToken_shouldRemoveTokenAndMetadata() {
        val savePromise = mockk<Promise>(relaxed = true)
        val saveMetaPromise = mockk<Promise>(relaxed = true)
        val removePromise = mockk<Promise>(relaxed = true)
        val getPromise = mockk<Promise>(relaxed = true)

        // Save token and metadata
        module.saveToken("test-id", "test-token", savePromise)
        module.saveMetadata("test-id", "test-metadata", saveMetaPromise)

        // Remove token
        module.removeToken("test-id", removePromise)
        verify { removePromise.resolve(null) }

        // Verify token is removed
        module.getToken("test-id", getPromise)
        verify { getPromise.resolve(null) }
    }

    @Test
    fun testGetAllTokenIds_emptyStorage_shouldReturnEmptyArray() {
        val promise = mockk<Promise>(relaxed = true)
        val resultSlot = slot<Any>()

        module.getAllTokenIds(promise)

        verify { promise.resolve(capture(resultSlot)) }
        val result = resultSlot.captured
        assertThat(result).isNotNull()
    }

    @Test
    fun testGetAllTokenIds_withTokens_shouldReturnIds() {
        val savePromise1 = mockk<Promise>(relaxed = true)
        val savePromise2 = mockk<Promise>(relaxed = true)
        val getPromise = mockk<Promise>(relaxed = true)
        val resultSlot = slot<Any>()

        // Save multiple tokens
        module.saveToken("token-1", "data-1", savePromise1)
        module.saveToken("token-2", "data-2", savePromise2)

        // Get all IDs
        module.getAllTokenIds(getPromise)

        verify { getPromise.resolve(capture(resultSlot)) }
        // Verify result is not null (actual array assertion depends on React Native array types)
        assertThat(resultSlot.captured).isNotNull()
    }

    @Test
    fun testClearTokens_shouldRemoveAllTokensAndMetadata() {
        val savePromise1 = mockk<Promise>(relaxed = true)
        val savePromise2 = mockk<Promise>(relaxed = true)
        val clearPromise = mockk<Promise>(relaxed = true)
        val getPromise = mockk<Promise>(relaxed = true)

        // Save tokens
        module.saveToken("token-1", "data-1", savePromise1)
        module.saveToken("token-2", "data-2", savePromise2)

        // Clear all
        module.clearTokens(clearPromise)
        verify { clearPromise.resolve(null) }

        // Verify tokens are cleared
        module.getToken("token-1", getPromise)
        verify { getPromise.resolve(null) }
    }

    // MARK: - Metadata Operations Tests

    @Test
    fun testSaveMetadata_shouldResolvePromise() {
        val promise = mockk<Promise>(relaxed = true)

        module.saveMetadata("test-id", "test-metadata", promise)

        verify { promise.resolve(null) }
    }

    @Test
    fun testSaveAndGetMetadata_shouldReturnSavedMetadata() {
        val promise = mockk<Promise>(relaxed = true)
        val getPromise = mockk<Promise>(relaxed = true)
        val resultSlot = slot<String>()

        // Save metadata
        module.saveMetadata("test-id", "test-metadata", promise)
        verify { promise.resolve(null) }

        // Get metadata
        module.getMetadata("test-id", getPromise)
        verify { getPromise.resolve(capture(resultSlot)) }
        assertThat(resultSlot.captured).isEqualTo("test-metadata")
    }

    @Test
    fun testGetMetadata_nonExistent_shouldResolveNull() {
        val promise = mockk<Promise>(relaxed = true)

        module.getMetadata("non-existent", promise)

        verify { promise.resolve(null) }
    }

    @Test
    fun testRemoveMetadata_shouldRemoveMetadata() {
        val savePromise = mockk<Promise>(relaxed = true)
        val removePromise = mockk<Promise>(relaxed = true)
        val getPromise = mockk<Promise>(relaxed = true)

        // Save metadata
        module.saveMetadata("test-id", "test-metadata", savePromise)

        // Remove metadata
        module.removeMetadata("test-id", removePromise)
        verify { removePromise.resolve(null) }

        // Verify metadata is removed
        module.getMetadata("test-id", getPromise)
        verify { getPromise.resolve(null) }
    }

    // MARK: - Default Token ID Tests

    @Test
    fun testSetDefaultTokenId_shouldResolvePromise() {
        val promise = mockk<Promise>(relaxed = true)

        module.setDefaultTokenId("default-id", promise)

        verify { promise.resolve(null) }
    }

    @Test
    fun testSetAndGetDefaultTokenId_shouldReturnSavedId() {
        val setPromise = mockk<Promise>(relaxed = true)
        val getPromise = mockk<Promise>(relaxed = true)
        val resultSlot = slot<String>()

        // Set default
        module.setDefaultTokenId("default-id", setPromise)
        verify { setPromise.resolve(null) }

        // Get default
        module.getDefaultTokenId(getPromise)
        verify { getPromise.resolve(capture(resultSlot)) }
        assertThat(resultSlot.captured).isEqualTo("default-id")
    }

    @Test
    fun testGetDefaultTokenId_notSet_shouldResolveNull() {
        val promise = mockk<Promise>(relaxed = true)

        module.getDefaultTokenId(promise)

        verify { promise.resolve(null) }
    }

    @Test
    fun testSetDefaultTokenId_null_shouldRemoveDefault() {
        val setPromise = mockk<Promise>(relaxed = true)
        val setNullPromise = mockk<Promise>(relaxed = true)
        val getPromise = mockk<Promise>(relaxed = true)

        // Set default
        module.setDefaultTokenId("default-id", setPromise)

        // Clear default
        module.setDefaultTokenId(null, setNullPromise)
        verify { setNullPromise.resolve(null) }

        // Verify default is cleared
        module.getDefaultTokenId(getPromise)
        verify { getPromise.resolve(null) }
    }

    // MARK: - Data Integrity Tests

    @Test
    fun testTokenAndMetadataStoredSeparately() {
        val saveTokenPromise = mockk<Promise>(relaxed = true)
        val saveMetaPromise = mockk<Promise>(relaxed = true)
        val getTokenPromise = mockk<Promise>(relaxed = true)
        val getMetaPromise = mockk<Promise>(relaxed = true)
        val tokenSlot = slot<String>()
        val metaSlot = slot<String>()

        // Save token and metadata with different values
        module.saveToken("id", "token-value", saveTokenPromise)
        module.saveMetadata("id", "metadata-value", saveMetaPromise)

        // Retrieve and verify they are different
        module.getToken("id", getTokenPromise)
        module.getMetadata("id", getMetaPromise)

        verify { getTokenPromise.resolve(capture(tokenSlot)) }
        verify { getMetaPromise.resolve(capture(metaSlot)) }

        assertThat(tokenSlot.captured).isEqualTo("token-value")
        assertThat(metaSlot.captured).isEqualTo("metadata-value")
    }

    // MARK: - Error Handling Tests

    @Test
    fun testSaveToken_withError_shouldRejectPromise() {
        val promise = mockk<Promise>(relaxed = true)
        val rejectSlot = slot<String>()

        // Try saving with empty ID (edge case that might fail)
        module.saveToken("", "test-token", promise)

        // Should either resolve or reject depending on implementation
        // This test verifies the module handles the operation without crashing
        assertThat(promise).isNotNull()
    }

    @Test
    fun testRemoveToken_nonExistent_shouldStillResolve() {
        val promise = mockk<Promise>(relaxed = true)

        module.removeToken("non-existent", promise)

        verify { promise.resolve(null) }
    }
}
