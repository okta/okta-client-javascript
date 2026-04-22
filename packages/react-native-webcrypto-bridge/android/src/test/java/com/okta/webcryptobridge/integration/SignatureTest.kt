package com.okta.webcryptobridge.integration

import android.util.Base64
import com.google.common.truth.Truth.assertThat
import org.json.JSONObject
import org.junit.Test
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/**
 * Integration tests for WebCryptoBridgeModule signature operations.
 * Tests error handling and API contracts for sign/verify.
 *
 * Note: Tests requiring actual cryptographic operations on generated keys
 * (actual signing/verification) are not included as they require real key material
 * and full Android Keystore support beyond Robolectric's capabilities.
 */
@org.junit.runner.RunWith(RobolectricTestRunner::class)
@Config(sdk = [33])
class SignatureTest : WebCryptoBridgeModuleTest() {

    @Test
    fun testSign_unknownKeyId_rejects() {
        // Arrange
        val data = "test message".toByteArray()
        val dataBase64 = Base64.encodeToString(data, Base64.NO_WRAP)
        val algorithmJson = JSONObject().put("name", "RSASSA-PKCS1-v1_5")

        // Act
        val mockedPromise = createMockPromise()
        module.sign(algorithmJson.toString(), "nonexistent_key", dataBase64, mockedPromise.getMockPromise())

        // Assert
        assertThat(mockedPromise.isRejected).isTrue()
        assertThat(mockedPromise.rejectedCode).isEqualTo("key_not_found")
    }
}

