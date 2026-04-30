package com.okta.webcryptobridge.integration

import android.util.Base64
import com.google.common.truth.Truth.assertThat
import org.json.JSONObject
import org.junit.Test
import org.robolectric.RobolectricTestRunner

/**
 * Integration tests for WebCryptoBridgeModule.generateKey() method.
 * Tests key generation flow with Android Keystore via Robolectric.
 */
@org.junit.runner.RunWith(RobolectricTestRunner::class)
class KeyGenerationTest : WebCryptoBridgeModuleTest() {

    @Test
    fun testGenerateKey_validRSA2048_createsKeystoreEntry() {
        // Arrange
        val algorithmJson = JSONObject().apply {
            put("name", "RSASSA-PKCS1-v1_5")
            put("modulusLength", 2048)
        }
        val keyUsages = createReadableArray("sign", "verify")
        val mockedPromise = createMockPromise()
        val promise = mockedPromise.getMockPromise()

        // Act
        module.generateKey(algorithmJson.toString(), false, keyUsages, promise)

        // Assert
        if (!mockedPromise.isResolved && mockedPromise.isRejected) {
            throw AssertionError("Promise was rejected instead of resolved. Code: ${mockedPromise.rejectedCode}, Message: ${mockedPromise.rejectedMessage}")
        }
        if (!mockedPromise.isResolved && !mockedPromise.isRejected) {
            throw AssertionError("Promise was neither resolved nor rejected. No response from generateKey().")
        }

        assertThat(mockedPromise.isResolved).isTrue()
        assertThat(mockedPromise.isRejected).isFalse()
        val result = JSONObject(mockedPromise.resolvedValue as String)
        assertThat(result.has("id")).isTrue()
        assertThat(result.getString("id")).isNotEmpty()
    }

    @Test
    fun testGenerateKey_unsupportedAlgorithm_rejects() {
        // Arrange
        val algorithmJson = JSONObject().put("name", "UNSUPPORTED_ALGORITHM")
        val mockedPromise = createMockPromise()
        val promise = mockedPromise.getMockPromise()

        // Act
        module.generateKey(algorithmJson.toString(), false, createReadableArray(), promise)

        // Assert
        assertThat(mockedPromise.isRejected).isTrue()
        assertThat(mockedPromise.rejectedCode).isEqualTo("unsupported_algorithm")
        assertThat(mockedPromise.rejectedMessage).contains("not supported")
    }

    @Test
    fun testGenerateKey_invalidModulusLength_rejects() {
        // Arrange - 1024-bit RSA is not supported (minimum is 512, but we require 2048)
        val algorithmJson = JSONObject().apply {
            put("name", "RSASSA-PKCS1-v1_5")
            put("modulusLength", 1024)
        }
        val mockedPromise = createMockPromise()
        val promise = mockedPromise.getMockPromise()

        // Act
        module.generateKey(algorithmJson.toString(), false, createReadableArray("sign"), promise)

        // Assert
        assertThat(mockedPromise.isRejected).isTrue()
        assertThat(mockedPromise.rejectedCode).isEqualTo("invalid_key_parameters")
    }

    @Test
    fun testGenerateKey_emptyKeyUsages_rejects() {
        // Arrange
        val algorithmJson = JSONObject().apply {
            put("name", "RSASSA-PKCS1-v1_5")
            put("modulusLength", 2048)
        }
        val mockedPromise = createMockPromise()
        val promise = mockedPromise.getMockPromise()

        // Act - empty key usages array
        module.generateKey(algorithmJson.toString(), false, createReadableArray(), promise)

        // Assert
        assertThat(mockedPromise.isRejected).isTrue()
        assertThat(mockedPromise.rejectedCode).isEqualTo("invalid_key_usages")
    }

    @Test
    fun testGenerateKey_invalidKeyUsage_rejects() {
        // Arrange
        val algorithmJson = JSONObject().apply {
            put("name", "RSASSA-PKCS1-v1_5")
            put("modulusLength", 2048)
        }
        val mockedPromise = createMockPromise()
        val promise = mockedPromise.getMockPromise()

        // Act - invalid usage "encrypt"
        module.generateKey(algorithmJson.toString(), false, createReadableArray("encrypt"), promise)

        // Assert
        assertThat(mockedPromise.isRejected).isTrue()
        assertThat(mockedPromise.rejectedCode).isEqualTo("invalid_key_usages")
    }

    @Test
    fun testGenerateKey_multipleKeys_createsDistinctIds() {
        // Arrange
        val algorithmJson = JSONObject().apply {
            put("name", "RSASSA-PKCS1-v1_5")
            put("modulusLength", 2048)
        }
        val keyUsages = createReadableArray("sign", "verify")

        // Act - generate two keys
        val mockedPromise1 = createMockPromise()
        module.generateKey(algorithmJson.toString(), false, keyUsages, mockedPromise1.getMockPromise())

        val mockedPromise2 = createMockPromise()
        module.generateKey(algorithmJson.toString(), false, keyUsages, mockedPromise2.getMockPromise())

        // Assert
        val id1 = JSONObject(mockedPromise1.resolvedValue as String).getString("id")
        val id2 = JSONObject(mockedPromise2.resolvedValue as String).getString("id")
        assertThat(id1).isNotEqualTo(id2)
    }
}
