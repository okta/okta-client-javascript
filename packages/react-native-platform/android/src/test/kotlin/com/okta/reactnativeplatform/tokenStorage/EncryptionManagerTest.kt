package com.okta.reactnativeplatform

import android.util.Base64
import org.junit.Before
import org.junit.Test
import org.junit.Ignore
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import com.google.common.truth.Truth.assertThat
import org.junit.Assert.assertThrows
import org.junit.Assume

/**
 * Unit tests for EncryptionManager.
 * Tests AES-256-GCM encryption/decryption with random IV generation.
 *
 * Note: These tests require Android Keystore to be available.
 * On CI environments without Keystore support, these tests are skipped.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class EncryptionManagerTest {

    private lateinit var encryptionManager: EncryptionManager
    private var keystoreAvailable = false

    @Before
    fun setUp() {
        // Note: EncryptionManager initialization will be skipped if AndroidKeystore is not available
        try {
            encryptionManager = EncryptionManager()
            keystoreAvailable = true
        } catch (e: Exception) {
            // AndroidKeyStore not available in test environment - tests will be skipped
            // This is expected on CI environments
            keystoreAvailable = false
        }
    }

    // MARK: - Basic Encryption Tests

    @Test
    fun testEncryptString_returnsBase64EncodedValue() {
        Assume.assumeTrue("Android Keystore not available", keystoreAvailable)
        
        val plaintext = "test-token-data"
        
        val encrypted = encryptionManager.encryptString(plaintext)
        
        assertThat(encrypted).isNotNull()
        assertThat(encrypted).isNotEmpty()
        // Encrypted value should be valid Base64
        assertThat(isValidBase64(encrypted)).isTrue()
    }

    @Test
    fun testDecryptString_retrievesOriginalPlaintext() {
        Assume.assumeTrue("Android Keystore not available", keystoreAvailable)
        
        val plaintext = "test-token-data"
        
        val encrypted = encryptionManager.encryptString(plaintext)
        val decrypted = encryptionManager.decryptString(encrypted)
        
        assertThat(decrypted).isEqualTo(plaintext)
    }

    @Test
    fun testEncryptDecryptRoundTrip_withComplexData() {
        Assume.assumeTrue("Android Keystore not available", keystoreAvailable)
        
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
        Assume.assumeTrue("Android Keystore not available", keystoreAvailable)
        
        val plaintext = "token-with-unicode-🔐-key"
        
        val encrypted = encryptionManager.encryptString(plaintext)
        val decrypted = encryptionManager.decryptString(encrypted)
        
        assertThat(decrypted).isEqualTo(plaintext)
    }

    // MARK: - IV Tests

    @Test
    fun testEncryptString_generatesRandomIV() {
        Assume.assumeTrue("Android Keystore not available", keystoreAvailable)
        
        val plaintext = "test-token-data"
        
        val encrypted1 = encryptionManager.encryptString(plaintext)
        val encrypted2 = encryptionManager.encryptString(plaintext)
        
        // Same plaintext encrypted twice should produce different ciphertexts
        // due to random IV generation
        assertThat(encrypted1).isNotEqualTo(encrypted2)
    }

    @Test
    fun testEncryptString_ivIsPrependedToCiphertext() {
        Assume.assumeTrue("Android Keystore not available", keystoreAvailable)
        
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
        Assume.assumeTrue("Android Keystore not available", keystoreAvailable)
        
        val invalidBase64 = "!!!not-valid-base64!!!"
        
        assertThrows(Exception::class.java) {
            encryptionManager.decryptString(invalidBase64)
        }
    }

    @Test
    fun testDecryptString_withTamperedData_throwsException() {
        Assume.assumeTrue("Android Keystore not available", keystoreAvailable)
        
        val plaintext = "test-token-data"
        val encrypted = encryptionManager.encryptString(plaintext)
        
        // Tamper with encrypted data by flipping a bit
        val encryptedBytes = Base64.decode(encrypted, Base64.NO_WRAP)
        encryptedBytes[encryptedBytes.size - 1] = (encryptedBytes[encryptedBytes.size - 1].toInt() xor 1).toByte()
        val tamperedEncrypted = Base64.encodeToString(encryptedBytes, Base64.NO_WRAP)
        
        // GCM should detect tampering and throw an exception
        assertThrows(Exception::class.java) {
            encryptionManager.decryptString(tamperedEncrypted)
        }
    }

    @Test
    fun testDecryptString_withTruncatedData_throwsException() {
        Assume.assumeTrue("Android Keystore not available", keystoreAvailable)
        
        val plaintext = "test-token-data"
        val encrypted = encryptionManager.encryptString(plaintext)
        
        // Truncate encrypted data
        val truncated = encrypted.substring(0, encrypted.length / 2)
        
        assertThrows(Exception::class.java) {
            encryptionManager.decryptString(truncated)
        }
    }

    @Test
    fun testDecryptString_withDataMissingIV_throwsException() {
        Assume.assumeTrue("Android Keystore not available", keystoreAvailable)
        
        // Create data that's too short to contain IV (12 bytes)
        val shortData = Base64.encodeToString(ByteArray(5), Base64.NO_WRAP)
        
        assertThrows(Exception::class.java) {
            encryptionManager.decryptString(shortData)
        }
    }

    // MARK: - Empty/Edge Case Tests

    @Test
    fun testEncryptDecrypt_withEmptyString() {
        Assume.assumeTrue("Android Keystore not available", keystoreAvailable)
        
        val plaintext = ""
        
        val encrypted = encryptionManager.encryptString(plaintext)
        val decrypted = encryptionManager.decryptString(encrypted)
        
        assertThat(decrypted).isEqualTo(plaintext)
    }

    @Test
    fun testEncryptDecrypt_withLargeString() {
        Assume.assumeTrue("Android Keystore not available", keystoreAvailable)
        
        // Create a large string (1MB)
        val plaintext = "x".repeat(1024 * 1024)
        
        val encrypted = encryptionManager.encryptString(plaintext)
        val decrypted = encryptionManager.decryptString(encrypted)
        
        assertThat(decrypted).isEqualTo(plaintext)
    }

    @Test
    fun testEncryptDecrypt_withSpecialCharacters() {
        Assume.assumeTrue("Android Keystore not available", keystoreAvailable)
        
        val plaintext = "!@#$%^&*()_+-={}[]|\\:;\"'<>,.?/"
        
        val encrypted = encryptionManager.encryptString(plaintext)
        val decrypted = encryptionManager.decryptString(encrypted)
        
        assertThat(decrypted).isEqualTo(plaintext)
    }

    // MARK: - Hardware-Backed Keystore Fallback Tests

    @Test
    fun testKeyGeneration_succeedsWithFallback() {
        Assume.assumeTrue("Android Keystore not available", keystoreAvailable)

        // This test verifies that key generation succeeds.
        // If hardware-backed keystore is available, the first attempt succeeds.
        // If not available, the fallback to software-backed succeeds.
        // Either way, encryption/decryption should work.
        val plaintext = "test-token-for-key-generation"

        val encrypted = encryptionManager.encryptString(plaintext)
        val decrypted = encryptionManager.decryptString(encrypted)

        // If we reach here, key generation succeeded with either hardware or software backing
        assertThat(decrypted).isEqualTo(plaintext)
    }

    @Test
    fun testEncryptDecrypt_withKeyStoreBackingVariation() {
        Assume.assumeTrue("Android Keystore not available", keystoreAvailable)

        // Test that encryption works consistently, regardless of whether the key
        // was generated with hardware-backed or software-backed keystore.
        // Both approaches should produce the same encryption/decryption behavior.
        val plaintext = "consistent-encryption-test"

        val encrypted1 = encryptionManager.encryptString(plaintext)
        val decrypted1 = encryptionManager.decryptString(encrypted1)

        val encrypted2 = encryptionManager.encryptString(plaintext)
        val decrypted2 = encryptionManager.decryptString(encrypted2)

        // Both encryptions should decrypt to the same plaintext
        assertThat(decrypted1).isEqualTo(plaintext)
        assertThat(decrypted2).isEqualTo(plaintext)
        // Different IVs should produce different ciphertexts
        assertThat(encrypted1).isNotEqualTo(encrypted2)
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
