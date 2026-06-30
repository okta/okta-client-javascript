package com.okta.reactnativeplatform

import android.annotation.SuppressLint
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

    private val keyStore: java.security.KeyStore by lazy {
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
     * Cache of key type detection to avoid repeated attempts per app session.
     * Null = not yet determined, true = hardware-backed, false = software-backed
     */
    private var detectedKeyType: Boolean? = null

    /**
     * Deletes the existing master key from the keystore.
     * Used when a key becomes unusable or needs to be regenerated.
     */
    private fun deleteExistingKey() {
        try {
            keyStore.deleteEntry(MASTER_KEY_ALIAS)
            detectedKeyType = null  // Reset cache
        } catch (e: Exception) {
        }
    }

    /**
     * Determines the key type by attempting operations.
     * Returns true if hardware-backed, false if software-backed.
     * This is determined by which path actually works, not by external detection.
     */
    private fun determineKeyType(): Boolean {
        // Return cached result if already determined
        detectedKeyType?.let {
            return it
        }

        
        return try {
            // Try hardware path first (no custom IV)
            val testCipher = Cipher.getInstance(TRANSFORMATION)
            val testKey = getMasterKey()
            testCipher.init(Cipher.ENCRYPT_MODE, testKey)
            
            // If we got here without exception, hardware path works
            detectedKeyType = true
            true
        } catch (hwE: Exception) {
            
            // Try software path (with custom IV)
            try {
                val testIV = ByteArray(IV_LENGTH_BYTES)
                val testCipher = Cipher.getInstance(TRANSFORMATION)
                val gcmSpec = GCMParameterSpec(GCM_TAG_LENGTH_BITS, testIV)
                val testKey = getMasterKey()
                testCipher.init(Cipher.ENCRYPT_MODE, testKey, gcmSpec)
                
                // If we got here without exception, software path works
                detectedKeyType = false
                false
            } catch (swE: Exception) {
                // Default to software-backed to allow retry with fresh key generation
                detectedKeyType = false
                false
            }
        }
    }

    /**
     * Encrypts plaintext using AES-256-GCM with appropriate IV handling.
     * Returns Base64-encoded (IV + ciphertext) for storage when applicable.
     *
     * @param plaintext The data to encrypt
     * @return Base64-encoded string of encrypted data
     * @throws Exception if encryption fails
     */
    fun encryptString(plaintext: String): String {
        val dataToEncrypt = plaintext.toByteArray(Charsets.UTF_8)
        
        val isHardwareBacked = determineKeyType()
        
        return if (isHardwareBacked) {
            encryptWithHardwareKey(dataToEncrypt)
        } else {
            encryptWithSoftwareKey(dataToEncrypt)
        }
    }

    /**
     * Encrypts using hardware-backed key.
     * Hardware keystores generate their own IV. We extract it and prepend to ciphertext.
     */
    private fun encryptWithHardwareKey(dataToEncrypt: ByteArray): String {
        try {
            val cipher = Cipher.getInstance(TRANSFORMATION)
            
            val secretKey = getMasterKey()
            
            // Init without custom IV - let hardware keystore manage it
            cipher.init(Cipher.ENCRYPT_MODE, secretKey)
            
            // Encrypt data
            val ciphertext = cipher.doFinal(dataToEncrypt)
            
            // Extract the IV that was generated by the hardware keystore
            val generatedIV = cipher.iv
            
            // Combine IV + ciphertext and Base64 encode (same format as software path)
            val encryptedData = (generatedIV ?: ByteArray(0)) + ciphertext
            
            val encoded = Base64.encodeToString(encryptedData, Base64.NO_WRAP)
            return encoded
        } catch (e: Exception) {
            throw Exception("Hardware-backed encryption failed: ${e.message}", e)
        }
    }

    /**
     * Encrypts using software-backed key with caller-provided IV.
     * Gives us control over IV generation and storage.
     * Only called when key type determination confirms software-backed.
     */
    private fun encryptWithSoftwareKey(dataToEncrypt: ByteArray): String {
        try {
            
            // Generate random IV
            val iv = ByteArray(IV_LENGTH_BYTES)
            java.security.SecureRandom().nextBytes(iv)
            
            // Get cipher and apply GCM spec with custom IV
            val cipher = Cipher.getInstance(TRANSFORMATION)
            
            val gcmSpec = GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv)
            
            val secretKey = getMasterKey()
            
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, gcmSpec)
            
            // Encrypt data
            val ciphertext = cipher.doFinal(dataToEncrypt)
            
            // Combine IV + ciphertext and Base64 encode
            val encryptedData = iv + ciphertext
            
            val encoded = Base64.encodeToString(encryptedData, Base64.NO_WRAP)
            return encoded
        } catch (e: Exception) {
            throw Exception("Software-backed encryption failed: ${e.message}", e)
        }
    }

    /**
     * Decrypts Base64-encoded encrypted data back to plaintext.
     * Uses the appropriate decryption method based on key type.
     *
     * @param encryptedString Base64-encoded encrypted data
     * @return Decrypted plaintext
     * @throws Exception if decryption fails or data is corrupted
     */
    fun decryptString(encryptedString: String): String {
        
        val isHardwareBacked = determineKeyType()
        
        return if (isHardwareBacked) {
            decryptWithHardwareKey(encryptedString)
        } else {
            decryptWithSoftwareKey(encryptedString)
        }
    }

    /**
     * Decrypts using hardware-backed key.
     * Extracts IV from the beginning of the encrypted data and provides it to the cipher.
     */
    private fun decryptWithHardwareKey(encryptedString: String): String {
        try {
            val encryptedData = Base64.decode(encryptedString, Base64.NO_WRAP)
            
            // Extract IV and ciphertext
            if (encryptedData.size < IV_LENGTH_BYTES) {
                throw IllegalArgumentException("Encrypted data too short: missing IV")
            }
            
            val iv = encryptedData.sliceArray(0 until IV_LENGTH_BYTES)
            
            val ciphertext = encryptedData.sliceArray(IV_LENGTH_BYTES until encryptedData.size)
            
            // Initialize cipher with the extracted IV
            val cipher = Cipher.getInstance(TRANSFORMATION)
            
            val gcmSpec = GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv)
            
            val secretKey = getMasterKey()
            
            cipher.init(Cipher.DECRYPT_MODE, secretKey, gcmSpec)
            
            val plaintext = cipher.doFinal(ciphertext)
            
            val result = String(plaintext, Charsets.UTF_8)
            return result
        } catch (e: Exception) {
            throw Exception("Hardware-backed decryption failed: ${e.message}", e)
        }
    }

    /**
     * Decrypts using software-backed key with caller-managed IV.
     */
    private fun decryptWithSoftwareKey(encryptedString: String): String {
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
            
            val result = String(plaintext, Charsets.UTF_8)
            return result
        } catch (e: Exception) {
            throw Exception("Software-backed decryption failed: ${e.message}", e)
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
     * Attempts hardware-backed keystore first, falls back to software-backed if unavailable.
     *
     * @return Newly generated AES-256 SecretKey
     */
    @SuppressLint("NewApi")
    private fun generateMasterKey(): SecretKey {
        val keyGenerator = KeyGenerator.getInstance(ALGORITHM, KEYSTORE_PROVIDER)
        
        try {
            // attempt hardware-backed keystore first
            val keySpec = KeyGenParameterSpec.Builder(
                MASTER_KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
            ).apply {
                setKeySize(KEY_SIZE)
                setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                setIsStrongBoxBacked(true)
            }.build()

            keyGenerator.init(keySpec)
            
            val key = keyGenerator.generateKey()
            return key
        } catch (e: Exception) {
            // fallback to software-backed keystore if hardware is not available
            try {
                val keySpec = KeyGenParameterSpec.Builder(
                    MASTER_KEY_ALIAS,
                    KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
                ).apply {
                    setKeySize(KEY_SIZE)
                    setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                    setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                    setIsStrongBoxBacked(false)
                }.build()
                
                keyGenerator.init(keySpec)
                
                val key = keyGenerator.generateKey()
                return key
            } catch (fallbackE: Exception) {
                throw Exception("Failed to generate encryption key: ${fallbackE.message}", fallbackE)
            }
        }
    }
}
