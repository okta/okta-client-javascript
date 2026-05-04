package com.okta.reactnativeplatform

import android.util.Base64
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import com.google.common.truth.Truth.assertThat

/**
 * Unit tests for EncryptionManager.
 * Tests AES-256-GCM encryption/decryption with random IV generation.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class EncryptionManagerTest {

    private lateinit var encryptionManager: EncryptionManager

    @Before
    fun setUp() {
        encryptionManager = EncryptionManager()
    }

    // MARK: - Basic Encryption Tests

    @Test
    fun testEncryptString_returnsBase64EncodedValue() {
        val plaintext = "test-token-data"
        
        val encrypted = encryptionManager.encryptString(plaintext)
        
        assertThat(encrypted).isNotNull()
        assertThat(encrypted).isNotEmpty()
        // Encrypted value should be valid Base64
        assertThat(isValidBase64(encrypted)).isTrue()
    }

    @Test
    fun testDecryptString_retrievesOriginalPlaintext() {
        val plaintext = "test-token-data"
        
        val encrypted = encryptionManager.encryptString(plaintext)
        val decrypted = encryptionManager.decryptString(encrypted)
        
        assertThat(decrypted).isEqualTo(plaintext)
    }

    @Test
    fun testEncryptDecryptRoundTrip_withComplexData() {
        val plaintext = """
            {
                "access_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjEifQ",
                "token_type": "Bearer",
                "expires_in": 3600,
                "scope": "openid profile email"
            }
        """.trimIndent()
        
        val encrypted = encryptionManager.encryptString(plaintext)
        val decrypted = encryptionManager.decryptString(encrypted)
        
        assertThat(decrypted).isEqualTo(plaintext)
    }

    @Test
    fun testEncryptDecryptRoundTrip_withUnicodeCharacters() {
        val plaintext = "token-with-unicode-🔐-key"
        
        val encrypted = encryptionManager.encryptString(plaintext)
        val decrypted = encryptionManager.decryptString(encrypted)
        
        assertThat(decrypted).isEqualTo(plaintext)
    }

    // MARK: - IV Tests

    @Test
    fun testEncryptString_generatesRandomIV() {
        val plaintext = "test-token-data"
        
        val encrypted1 = encryptionManager.encryptString(plaintext)
        val encrypted2 = encryptionManager.encryptString(plaintext)
        
        // Same plaintext encrypted twice should produce different ciphertexts
        // due to random IV generation
        assertThat(encrypted1).isNotEqualTo(encrypted2)
    }

    @Test
    fun testEncryptString_ivIsPrependedToCiphertext() {
        val plaintext = "test-token-data"
        
        val encrypted = encryptionManager.encryptString(plaintext)
        val encryptedBytes = Base64.decode(encrypted, Base64.NO_WRAP)
        
        // IV should be 12 bytes, followed by ciphertext
        // GCM authentication tag is 16 bytes (appended to ciphertext)
        // So minimum size: 12 (IV) + 1 (minimum plaintext) + 16 (tag) = 29 bytes
        assertThat(encryptedBytes.size).isAtLeast(29)
    }

    // MARK: - Error Handling Tests

    @Test
    fun testDecryptString_withInvalidBase64_throwsException() {
        val invalidBase64 = "!!!not-valid-base64!!!"
        
        assertThat {
            encryptionManager.decryptString(invalidBase64)
        }.throws(Exception::class.java)
    }

    @Test
    fun testDecryptString_withTampered Data_throwsException() {
        val plaintext = "test-token-data"
        val encrypted = encryptionManager.encryptString(plaintext)
        
        // Tamper with encrypted data by flipping a bit
        val encryptedBytes = Base64.decode(encrypted, Base64.NO_WRAP)
        encryptedBytes[encryptedBytes.size - 1] = (encryptedBytes[encryptedBytes.size - 1].toInt() xor 1).toByte()
        val tamperedEncrypted = Base64.encodeToString(encryptedBytes, Base64.NO_WRAP)
        
        // GCM should detect tampering and throw an exception
        assertThat {
            encryptionManager.decryptString(tamperedEncrypted)
        }.throws(Exception::class.java)
    }

    @Test
    fun testDecryptString_withTruncatedData_throwsException() {
        val plaintext = "test-token-data"
        val encrypted = encryptionManager.encryptString(plaintext)
        
        // Truncate encrypted data
        val truncated = encrypted.substring(0, encrypted.length / 2)
        
        assertThat {
            encryptionManager.decryptString(truncated)
        }.throws(Exception::class.java)
    }

    @Test
    fun testDecryptString_withDataMissingIV_throwsException() {
        // Create data that's too short to contain IV (12 bytes)
        val shortData = Base64.encodeToString(ByteArray(5), Base64.NO_WRAP)
        
        assertThat {
            encryptionManager.decryptString(shortData)
        }.throws(Exception::class.java)
    }

    // MARK: - Empty/Edge Case Tests

    @Test
    fun testEncryptDecrypt_withEmptyString() {
        val plaintext = ""
        
        val encrypted = encryptionManager.encryptString(plaintext)
        val decrypted = encryptionManager.decryptString(encrypted)
        
        assertThat(decrypted).isEqualTo(plaintext)
    }

    @Test
    fun testEncryptDecrypt_withLargeString() {
        // Create a large string (1MB)
        val plaintext = "x".repeat(1024 * 1024)
        
        val encrypted = encryptionManager.encryptString(plaintext)
        val decrypted = encryptionManager.decryptString(encrypted)
        
        assertThat(decrypted).isEqualTo(plaintext)
    }

    @Test
    fun testEncryptDecrypt_withSpecialCharacters() {
        val plaintext = "!@#$%^&*()_+-={}[]|\\:;\"'<>,.?/"
        
        val encrypted = encryptionManager.encryptString(plaintext)
        val decrypted = encryptionManager.decryptString(encrypted)
        
        assertThat(decrypted).isEqualTo(plaintext)
    }

    // MARK: - Helper Functions

    private fun isValidBase64(str: String): Boolean {
        return try {
            Base64.decode(str, Base64.NO_WRAP)
            true
        } catch (e: IllegalArgumentException) {
            false
        }
    }
}
