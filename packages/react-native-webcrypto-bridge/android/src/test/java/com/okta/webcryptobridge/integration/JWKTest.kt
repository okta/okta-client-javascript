package com.okta.webcryptobridge.integration

import com.google.common.truth.Truth.assertThat
import org.json.JSONObject
import org.junit.Test
import org.robolectric.RobolectricTestRunner

/**
 * Integration tests for WebCryptoBridgeModule JWK import and error handling.
 * Tests JWK import API contracts and error cases.
 *
 * Note: Tests requiring actual cryptographic operations on generated keys
 * (export, sign/verify) are not included as they require real key material
 * and full Android Keystore support beyond Robolectric's capabilities.
 */
@org.junit.runner.RunWith(RobolectricTestRunner::class)
class JWKTest : WebCryptoBridgeModuleTest() {

    @Test
    fun testExportKey_unknownKeyId_rejects() {
        // Act
        val mockedPromise = createMockPromise()
        module.exportKey("jwk", "nonexistent_key_id", mockedPromise.getMockPromise())

        // Assert
        assertThat(mockedPromise.isRejected).isTrue()
        assertThat(mockedPromise.rejectedCode).isEqualTo("key_not_found")
    }

    @Test
    fun testExportKey_unsupportedFormat_rejects() {
        // Arrange - create a test JWK for export
        val testJWK = JSONObject().apply {
            put("kty", "RSA")
            put("alg", "RS256")
            put("n", "8nIJVnXLVqSxz1WqZhpq9xXL4fHBp5V1H1Fw_qKVB_kqKJ35mqYmGMf7jHljbf0Zbt6eKnCJrzg2p8TpCJ1sVCqvxmD8ZfjnEWKWZ_0vqZEJb0n5hJKb7nnJxKIV-r7sXvJCRm5dJEoJdWqiEEQCt9UzvHXk5YCeqZxBtVpqU8")
            put("e", "AQAB")
        }
        val algorithm = JSONObject().put("name", "RSASSA-PKCS1-v1_5")

        // Import the key first
        val mockedImportPromise = createMockPromise()
        module.importKey("jwk", testJWK.toString(), algorithm.toString(), true, createReadableArray("verify"), mockedImportPromise.getMockPromise())
        val keyId = mockedImportPromise.resolvedValue as String

        // Act - try to export with unsupported format
        val mockedPromise = createMockPromise()
        module.exportKey("pem", keyId, mockedPromise.getMockPromise())

        // Assert
        assertThat(mockedPromise.isRejected).isTrue()
        assertThat(mockedPromise.rejectedCode).isEqualTo("unsupported_format")
    }

    @Test
    fun testImportKey_validJWK_succeeds() {
        // Arrange - create a test JWK (from a real RSA key)
        val testJWK = JSONObject().apply {
            put("kty", "RSA")
            put("alg", "RS256")
            // 512-bit RSA test modulus
            put("n", "8nIJVnXLVqSxz1WqZhpq9xXL4fHBp5V1H1Fw_qKVB_kqKJ35mqYmGMf7jHljbf0Zbt6eKnCJrzg2p8TpCJ1sVCqvxmD8ZfjnEWKWZ_0vqZEJb0n5hJKb7nnJxKIV-r7sXvJCRm5dJEoJdWqiEEQCt9UzvHXk5YCeqZxBtVpqU8")
            put("e", "AQAB")
        }
        val algorithm = JSONObject().put("name", "RSASSA-PKCS1-v1_5")

        // Act
        val mockedPromise = createMockPromise()
        module.importKey("jwk", testJWK.toString(), algorithm.toString(), true, createReadableArray("verify"), mockedPromise.getMockPromise())

        // Assert
        assertThat(mockedPromise.isResolved).isTrue()
        val importedKeyId = mockedPromise.resolvedValue as String
        assertThat(importedKeyId).isNotEmpty()
    }

    @Test
    fun testImportKey_missingModulus_rejects() {
        // Arrange - JWK without modulus
        val incompleteJWK = JSONObject().apply {
            put("kty", "RSA")
            put("e", "AQAB")
            // missing "n"
        }
        val algorithm = JSONObject().put("name", "RSASSA-PKCS1-v1_5")

        // Act
        val mockedPromise = createMockPromise()
        module.importKey("jwk", incompleteJWK.toString(), algorithm.toString(), true, createReadableArray("verify"), mockedPromise.getMockPromise())

        // Assert
        assertThat(mockedPromise.isRejected).isTrue()
    }
}

