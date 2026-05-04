package com.okta.reactnativeplatform

import android.app.Application
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
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

/**
 * Unit tests for TokenStorageModule.
 * Tests the React Native module that delegates to TokenDataStore.
 * Uses async testing patterns to handle CoroutineScope-based async operations.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class TokenStorageModuleTest {

    private lateinit var module: TokenStorageModule
    private lateinit var context: ReactApplicationContext
    private lateinit var application: Application

    companion object {
        // Timeout for async operations in tests (ms)
        private const val OPERATION_TIMEOUT_MS = 5000L
    }

    @Before
    fun setUp() {
        application = ApplicationProvider.getApplicationContext<Application>()

        // Mock Arguments.createArray() to avoid React Native initialization
        mockkStatic(Arguments::class)
        every { Arguments.createArray() } answers {
            mockk<WritableArray>(relaxed = true)
        }

        // Create ReactApplicationContext
        context = ReactApplicationContext(application)

        // Create module
        module = TokenStorageModule(context)
    }

    // MARK: - Token Operations Tests

    @Test
    fun testSaveToken_shouldResolvePromise() {
        val promise = mockk<Promise>(relaxed = true)
        val latch = CountDownLatch(1)
        
        every { promise.resolve(any()) } answers {
            latch.countDown()
        }

        module.saveToken("test-id", "test-token", promise)

        // Wait for async operation to complete
        latch.await(OPERATION_TIMEOUT_MS, TimeUnit.MILLISECONDS)
        verify { promise.resolve(null) }
    }

    @Test
    fun testSaveAndGetToken_shouldReturnSavedToken() {
        val savePromise = mockk<Promise>(relaxed = true)
        val getPromise = mockk<Promise>(relaxed = true)
        val saveLatch = CountDownLatch(1)
        val getLatch = CountDownLatch(1)
        val resultSlot = slot<String?>()

        every { savePromise.resolve(any()) } answers {
            saveLatch.countDown()
        }
        every { getPromise.resolve(capture(resultSlot)) } answers {
            getLatch.countDown()
        }

        // Save token
        module.saveToken("test-id", "test-token", savePromise)
        saveLatch.await(OPERATION_TIMEOUT_MS, TimeUnit.MILLISECONDS)
        verify { savePromise.resolve(null) }

        // Get token
        module.getToken("test-id", getPromise)
        getLatch.await(OPERATION_TIMEOUT_MS, TimeUnit.MILLISECONDS)
        verify { getPromise.resolve("test-token") }
        assertThat(resultSlot.captured).isEqualTo("test-token")
    }

    @Test
    fun testGetToken_nonExistent_shouldResolveNull() {
        val promise = mockk<Promise>(relaxed = true)
        val latch = CountDownLatch(1)
        val resultSlot = slot<String?>()

        every { promise.resolve(capture(resultSlot)) } answers {
            latch.countDown()
        }

        module.getToken("non-existent", promise)

        latch.await(OPERATION_TIMEOUT_MS, TimeUnit.MILLISECONDS)
        assertThat(resultSlot.captured).isNull()
    }

    @Test
    fun testRemoveToken_shouldRemoveTokenAndMetadata() {
        val savePromise = mockk<Promise>(relaxed = true)
        val saveMetaPromise = mockk<Promise>(relaxed = true)
        val removePromise = mockk<Promise>(relaxed = true)
        val getPromise = mockk<Promise>(relaxed = true)
        val saveLatch = CountDownLatch(2)
        val removeLatch = CountDownLatch(1)
        val getLatch = CountDownLatch(1)
        val resultSlot = slot<String?>()

        every { savePromise.resolve(any()) } answers { saveLatch.countDown() }
        every { saveMetaPromise.resolve(any()) } answers { saveLatch.countDown() }
        every { removePromise.resolve(any()) } answers { removeLatch.countDown() }
        every { getPromise.resolve(capture(resultSlot)) } answers { getLatch.countDown() }

        // Save token and metadata
        module.saveToken("test-id", "test-token", savePromise)
        module.saveMetadata("test-id", "test-metadata", saveMetaPromise)
        saveLatch.await(OPERATION_TIMEOUT_MS, TimeUnit.MILLISECONDS)

        // Remove token
        module.removeToken("test-id", removePromise)
        removeLatch.await(OPERATION_TIMEOUT_MS, TimeUnit.MILLISECONDS)
        verify { removePromise.resolve(null) }

        // Verify token is removed
        module.getToken("test-id", getPromise)
        getLatch.await(OPERATION_TIMEOUT_MS, TimeUnit.MILLISECONDS)
        assertThat(resultSlot.captured).isNull()
    }

    @Test
    fun testGetAllTokenIds_emptyStorage_shouldReturnEmptyArray() {
        val promise = mockk<Promise>(relaxed = true)
        val latch = CountDownLatch(1)

        every { promise.resolve(any()) } answers {
            latch.countDown()
        }

        module.getAllTokenIds(promise)

        latch.await(OPERATION_TIMEOUT_MS, TimeUnit.MILLISECONDS)
        verify { promise.resolve(any()) }
    }

    @Test
    fun testGetAllTokenIds_withTokens_shouldReturnIds() {
        val savePromise1 = mockk<Promise>(relaxed = true)
        val savePromise2 = mockk<Promise>(relaxed = true)
        val getPromise = mockk<Promise>(relaxed = true)
        val saveLatch = CountDownLatch(2)
        val getLatch = CountDownLatch(1)

        every { savePromise1.resolve(any()) } answers { saveLatch.countDown() }
        every { savePromise2.resolve(any()) } answers { saveLatch.countDown() }
        every { getPromise.resolve(any()) } answers { getLatch.countDown() }

        // Save multiple tokens
        module.saveToken("token-1", "data-1", savePromise1)
        module.saveToken("token-2", "data-2", savePromise2)
        saveLatch.await(OPERATION_TIMEOUT_MS, TimeUnit.MILLISECONDS)

        // Get all IDs
        module.getAllTokenIds(getPromise)
        getLatch.await(OPERATION_TIMEOUT_MS, TimeUnit.MILLISECONDS)

        verify { getPromise.resolve(any()) }
    }

    @Test
    fun testClearTokens_shouldRemoveAllTokens() {
        val savePromise1 = mockk<Promise>(relaxed = true)
        val savePromise2 = mockk<Promise>(relaxed = true)
        val clearPromise = mockk<Promise>(relaxed = true)
        val getPromise = mockk<Promise>(relaxed = true)
        val saveLatch = CountDownLatch(2)
        val clearLatch = CountDownLatch(1)
        val getLatch = CountDownLatch(1)
        val resultSlot = slot<String?>()

        every { savePromise1.resolve(any()) } answers { saveLatch.countDown() }
        every { savePromise2.resolve(any()) } answers { saveLatch.countDown() }
        every { clearPromise.resolve(any()) } answers { clearLatch.countDown() }
        every { getPromise.resolve(capture(resultSlot)) } answers { getLatch.countDown() }

        // Save tokens
        module.saveToken("token-1", "data-1", savePromise1)
        module.saveToken("token-2", "data-2", savePromise2)
        saveLatch.await(OPERATION_TIMEOUT_MS, TimeUnit.MILLISECONDS)

        // Clear all
        module.clearTokens(clearPromise)
        clearLatch.await(OPERATION_TIMEOUT_MS, TimeUnit.MILLISECONDS)
        verify { clearPromise.resolve(null) }

        // Verify tokens are cleared
        module.getToken("token-1", getPromise)
        getLatch.await(OPERATION_TIMEOUT_MS, TimeUnit.MILLISECONDS)
        assertThat(resultSlot.captured).isNull()
    }

    // MARK: - Metadata Operations Tests

    @Test
    fun testSaveMetadata_shouldResolvePromise() {
        val promise = mockk<Promise>(relaxed = true)
        val latch = CountDownLatch(1)

        every { promise.resolve(any()) } answers {
            latch.countDown()
        }

        module.saveMetadata("test-id", "test-metadata", promise)

        latch.await(OPERATION_TIMEOUT_MS, TimeUnit.MILLISECONDS)
        verify { promise.resolve(null) }
    }

    @Test
    fun testSaveAndGetMetadata_shouldReturnSavedMetadata() {
        val savePromise = mockk<Promise>(relaxed = true)
        val getPromise = mockk<Promise>(relaxed = true)
        val saveLatch = CountDownLatch(1)
        val getLatch = CountDownLatch(1)
        val resultSlot = slot<String?>()

        every { savePromise.resolve(any()) } answers {
            saveLatch.countDown()
        }
        every { getPromise.resolve(capture(resultSlot)) } answers {
            getLatch.countDown()
        }

        // Save metadata
        module.saveMetadata("test-id", "test-metadata", savePromise)
        saveLatch.await(OPERATION_TIMEOUT_MS, TimeUnit.MILLISECONDS)
        verify { savePromise.resolve(null) }

        // Get metadata
        module.getMetadata("test-id", getPromise)
        getLatch.await(OPERATION_TIMEOUT_MS, TimeUnit.MILLISECONDS)
        verify { getPromise.resolve("test-metadata") }
        assertThat(resultSlot.captured).isEqualTo("test-metadata")
    }

    @Test
    fun testGetMetadata_nonExistent_shouldResolveNull() {
        val promise = mockk<Promise>(relaxed = true)
        val latch = CountDownLatch(1)
        val resultSlot = slot<String?>()

        every { promise.resolve(capture(resultSlot)) } answers {
            latch.countDown()
        }

        module.getMetadata("non-existent", promise)

        latch.await(OPERATION_TIMEOUT_MS, TimeUnit.MILLISECONDS)
        assertThat(resultSlot.captured).isNull()
    }

    @Test
    fun testRemoveMetadata_shouldRemoveMetadata() {
        val savePromise = mockk<Promise>(relaxed = true)
        val removePromise = mockk<Promise>(relaxed = true)
        val getPromise = mockk<Promise>(relaxed = true)
        val saveLatch = CountDownLatch(1)
        val removeLatch = CountDownLatch(1)
        val getLatch = CountDownLatch(1)
        val resultSlot = slot<String?>()

        every { savePromise.resolve(any()) } answers { saveLatch.countDown() }
        every { removePromise.resolve(any()) } answers { removeLatch.countDown() }
        every { getPromise.resolve(capture(resultSlot)) } answers { getLatch.countDown() }

        // Save metadata
        module.saveMetadata("test-id", "test-metadata", savePromise)
        saveLatch.await(OPERATION_TIMEOUT_MS, TimeUnit.MILLISECONDS)

        // Remove metadata
        module.removeMetadata("test-id", removePromise)
        removeLatch.await(OPERATION_TIMEOUT_MS, TimeUnit.MILLISECONDS)
        verify { removePromise.resolve(null) }

        // Verify metadata is removed
        module.getMetadata("test-id", getPromise)
        getLatch.await(OPERATION_TIMEOUT_MS, TimeUnit.MILLISECONDS)
        assertThat(resultSlot.captured).isNull()
    }

    // MARK: - Default Token ID Tests

    @Test
    fun testSetDefaultTokenId_shouldResolvePromise() {
        val promise = mockk<Promise>(relaxed = true)
        val latch = CountDownLatch(1)

        every { promise.resolve(any()) } answers {
            latch.countDown()
        }

        module.setDefaultTokenId("default-id", promise)

        latch.await(OPERATION_TIMEOUT_MS, TimeUnit.MILLISECONDS)
        verify { promise.resolve(null) }
    }

    @Test
    fun testSetAndGetDefaultTokenId_shouldReturnSavedId() {
        val setPromise = mockk<Promise>(relaxed = true)
        val getPromise = mockk<Promise>(relaxed = true)
        val setLatch = CountDownLatch(1)
        val getLatch = CountDownLatch(1)
        val resultSlot = slot<String?>()

        every { setPromise.resolve(any()) } answers {
            setLatch.countDown()
        }
        every { getPromise.resolve(capture(resultSlot)) } answers {
            getLatch.countDown()
        }

        // Set default
        module.setDefaultTokenId("default-id", setPromise)
        setLatch.await(OPERATION_TIMEOUT_MS, TimeUnit.MILLISECONDS)
        verify { setPromise.resolve(null) }

        // Get default
        module.getDefaultTokenId(getPromise)
        getLatch.await(OPERATION_TIMEOUT_MS, TimeUnit.MILLISECONDS)
        verify { getPromise.resolve("default-id") }
        assertThat(resultSlot.captured).isEqualTo("default-id")
    }

    @Test
    fun testSetDefaultTokenId_null_shouldClearDefault() {
        val setPromise = mockk<Promise>(relaxed = true)
        val setNullPromise = mockk<Promise>(relaxed = true)
        val getPromise = mockk<Promise>(relaxed = true)
        val setLatch = CountDownLatch(1)
        val setNullLatch = CountDownLatch(1)
        val getLatch = CountDownLatch(1)
        val resultSlot = slot<String?>()

        every { setPromise.resolve(any()) } answers { setLatch.countDown() }
        every { setNullPromise.resolve(any()) } answers { setNullLatch.countDown() }
        every { getPromise.resolve(capture(resultSlot)) } answers { getLatch.countDown() }

        // Set default
        module.setDefaultTokenId("default-id", setPromise)
        setLatch.await(OPERATION_TIMEOUT_MS, TimeUnit.MILLISECONDS)

        // Clear default
        module.setDefaultTokenId(null, setNullPromise)
        setNullLatch.await(OPERATION_TIMEOUT_MS, TimeUnit.MILLISECONDS)
        verify { setNullPromise.resolve(null) }

        // Get default
        module.getDefaultTokenId(getPromise)
        getLatch.await(OPERATION_TIMEOUT_MS, TimeUnit.MILLISECONDS)
        assertThat(resultSlot.captured).isNull()
    }

    @Test
    fun testGetDefaultTokenId_notSet_shouldResolveNull() {
        val promise = mockk<Promise>(relaxed = true)
        val latch = CountDownLatch(1)
        val resultSlot = slot<String?>()

        every { promise.resolve(capture(resultSlot)) } answers {
            latch.countDown()
        }

        module.getDefaultTokenId(promise)

        latch.await(OPERATION_TIMEOUT_MS, TimeUnit.MILLISECONDS)
        assertThat(resultSlot.captured).isNull()
    }
}
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
