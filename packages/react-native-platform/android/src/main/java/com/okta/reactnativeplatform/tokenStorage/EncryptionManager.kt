package com.okta.reactnativeplatform

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyStore
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * Manages AES-256-GCM encryption/decryption for token data.
 * Uses Android Keystore for secure key generation and storage.
 *
 * - Generates 256-bit AES keys in hardware keystore when available
 * - Uses AES-256-GCM for authenticated encryption
 * - Generates random 12-byte IVs for each encryption
 * - Prepends IV to ciphertext for decryption
 */
class EncryptionManager {
    companion object {
        // Keystore provider for secure key storage
        private const val KEYSTORE_PROVIDER = "AndroidKeyStore"
        
        // Master key alias - single key per app
        private const val MASTER_KEY_ALIAS = "okta_token_master_key"
        
        // Encryption algorithm and parameters
        private const val ALGORITHM = KeyProperties.KEY_ALGORITHM_AES
        private const val TRANSFORMATION = "AES/GCM/NoPadding"
        private const val KEY_SIZE = 256
        
        // GCM parameters
        private const val GCM_TAG_LENGTH_BITS = 128
        private const val IV_LENGTH_BYTES = 12
    }

    private val keyStore: javax.security.KeyStore by lazy {
        try {
            KeyStore.getInstance(KEYSTORE_PROVIDER).apply {
                load(null)
            }
        } catch (e: Exception) {
            // Fallback for test environments where AndroidKeyStore is not available
            throw Exception("Failed to initialize Android Keystore: ${e.message}", e)
        }
    }

    /**
     * Encrypts plaintext using AES-256-GCM with a random IV.
     * Returns Base64-encoded (IV + ciphertext) for storage.
     *
     * @param plaintext The data to encrypt
     * @return Base64-encoded string of (IV + ciphertext)
     * @throws Exception if encryption fails
     */
    fun encryptString(plaintext: String): String {
        val dataToEncrypt = plaintext.toByteArray(Charsets.UTF_8)
        
        // Generate random IV
        val iv = ByteArray(IV_LENGTH_BYTES)
        java.security.SecureRandom().nextBytes(iv)
        
        // Get cipher and apply GCM spec with IV
        val cipher = Cipher.getInstance(TRANSFORMATION)
        val gcmSpec = GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv)
        
        val secretKey = getMasterKey()
        cipher.init(Cipher.ENCRYPT_MODE, secretKey, gcmSpec)
        
        // Encrypt data
        val ciphertext = cipher.doFinal(dataToEncrypt)
        
        // Combine IV + ciphertext and Base64 encode
        val encryptedData = iv + ciphertext
        return Base64.encodeToString(encryptedData, Base64.NO_WRAP)
    }

    /**
     * Decrypts Base64-encoded (IV + ciphertext) back to plaintext.
     *
     * @param encryptedString Base64-encoded (IV + ciphertext)
     * @return Decrypted plaintext
     * @throws Exception if decryption fails or data is corrupted
     */
    fun decryptString(encryptedString: String): String {
        try {
            // Decode from Base64
            val encryptedData = Base64.decode(encryptedString, Base64.NO_WRAP)
            
            // Extract IV and ciphertext
            if (encryptedData.size < IV_LENGTH_BYTES) {
                throw IllegalArgumentException("Encrypted data too short: missing IV")
            }
            
            val iv = encryptedData.sliceArray(0 until IV_LENGTH_BYTES)
            val ciphertext = encryptedData.sliceArray(IV_LENGTH_BYTES until encryptedData.size)
            
            // Initialize cipher with IV
            val cipher = Cipher.getInstance(TRANSFORMATION)
            val gcmSpec = GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv)
            
            val secretKey = getMasterKey()
            cipher.init(Cipher.DECRYPT_MODE, secretKey, gcmSpec)
            
            // Decrypt
            val plaintext = cipher.doFinal(ciphertext)
            return String(plaintext, Charsets.UTF_8)
        } catch (e: Exception) {
            throw Exception("Decryption failed: ${e.message}", e)
        }
    }

    /**
     * Retrieves or generates the master key from Android Keystore.
     *
     * @return AES-256 SecretKey stored in Android Keystore
     */
    private fun getMasterKey(): SecretKey {
        // Check if key already exists
        val existingKey = keyStore.getKey(MASTER_KEY_ALIAS, null)
        if (existingKey is SecretKey) {
            return existingKey
        }
        
        // Generate new master key
        return generateMasterKey()
    }

    /**
     * Generates a new AES-256 key in Android Keystore.
     * Uses hardware-backed keystore when available.
     *
     * @return Newly generated AES-256 SecretKey
     */
    private fun generateMasterKey(): SecretKey {
        val keyGenerator = KeyGenerator.getInstance(ALGORITHM, KEYSTORE_PROVIDER)
        
        val keySpec = KeyGenParameterSpec.Builder(
            MASTER_KEY_ALIAS,
            KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
        ).apply {
            setKeySize(KEY_SIZE)
            setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            
            // Request hardware-backed keystore if available
            // Falls back to software keystore on devices without secure hardware
            setIsStrongBoxBacked(false)
        }.build()
        
        keyGenerator.init(keySpec)
        return keyGenerator.generateKey()
    }
}
