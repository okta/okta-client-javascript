package com.okta.reactnativeplatform

import android.annotation.SuppressLint
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import android.util.Log
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
            Log.i("EncryptionManager", "Initializing Android Keystore")
            KeyStore.getInstance(KEYSTORE_PROVIDER).apply {
                load(null)
            }
        } catch (e: Exception) {
            Log.e("EncryptionManager", "Failed to initialize Android Keystore", e)
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
            Log.w("EncryptionManager", "Deleting existing key: $MASTER_KEY_ALIAS")
            keyStore.deleteEntry(MASTER_KEY_ALIAS)
            detectedKeyType = null  // Reset cache
            Log.i("EncryptionManager", "Successfully deleted existing key")
        } catch (e: Exception) {
            Log.e("EncryptionManager", "Failed to delete existing key", e)
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
            Log.d("EncryptionManager", "Using cached key type: ${if (it) "hardware-backed" else "software-backed"}")
            return it
        }

        Log.i("EncryptionManager", "Determining key type by attempting operations...")
        
        return try {
            // Try hardware path first (no custom IV)
            val testCipher = Cipher.getInstance(TRANSFORMATION)
            val testKey = getMasterKey()
            testCipher.init(Cipher.ENCRYPT_MODE, testKey)
            
            // If we got here without exception, hardware path works
            Log.i("EncryptionManager", "Key type determination: HARDWARE-BACKED (no custom IV accepted)")
            detectedKeyType = true
            true
        } catch (hwE: Exception) {
            Log.d("EncryptionManager", "Hardware path failed: ${hwE.message}")
            
            // Try software path (with custom IV)
            try {
                val testIV = ByteArray(IV_LENGTH_BYTES)
                val testCipher = Cipher.getInstance(TRANSFORMATION)
                val gcmSpec = GCMParameterSpec(GCM_TAG_LENGTH_BITS, testIV)
                val testKey = getMasterKey()
                testCipher.init(Cipher.ENCRYPT_MODE, testKey, gcmSpec)
                
                // If we got here without exception, software path works
                Log.i("EncryptionManager", "Key type determination: SOFTWARE-BACKED (custom IV accepted)")
                detectedKeyType = false
                false
            } catch (swE: Exception) {
                Log.e("EncryptionManager", "Both hardware and software paths failed during type determination", swE)
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
        Log.i("EncryptionManager", "encryptString: Starting encryption")
        val dataToEncrypt = plaintext.toByteArray(Charsets.UTF_8)
        Log.d("EncryptionManager", "encryptString: Data size: ${dataToEncrypt.size} bytes")
        
        val isHardwareBacked = determineKeyType()
        Log.i("EncryptionManager", "encryptString: Using ${if (isHardwareBacked) "hardware-backed" else "software-backed"} encryption")
        
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
            Log.d("EncryptionManager", "encryptWithHardwareKey: Starting")
            val cipher = Cipher.getInstance(TRANSFORMATION)
            Log.d("EncryptionManager", "encryptWithHardwareKey: Cipher instance created")
            
            val secretKey = getMasterKey()
            Log.d("EncryptionManager", "encryptWithHardwareKey: Master key retrieved")
            
            // Init without custom IV - let hardware keystore manage it
            cipher.init(Cipher.ENCRYPT_MODE, secretKey)
            Log.d("EncryptionManager", "encryptWithHardwareKey: Cipher initialized without custom IV")
            
            // Encrypt data
            val ciphertext = cipher.doFinal(dataToEncrypt)
            Log.d("EncryptionManager", "encryptWithHardwareKey: Encryption completed, ciphertext size: ${ciphertext.size} bytes")
            
            // Extract the IV that was generated by the hardware keystore
            val generatedIV = cipher.iv
            Log.d("EncryptionManager", "encryptWithHardwareKey: Extracted generated IV, size: ${generatedIV?.size} bytes")
            
            // Combine IV + ciphertext and Base64 encode (same format as software path)
            val encryptedData = (generatedIV ?: ByteArray(0)) + ciphertext
            Log.d("EncryptionManager", "encryptWithHardwareKey: Combined IV+ciphertext, total size: ${encryptedData.size} bytes")
            
            val encoded = Base64.encodeToString(encryptedData, Base64.NO_WRAP)
            Log.i("EncryptionManager", "encryptWithHardwareKey: Encryption successful")
            return encoded
        } catch (e: Exception) {
            Log.e("EncryptionManager", "encryptWithHardwareKey: Encryption failed - ${e.javaClass.simpleName}: ${e.message}", e)
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
            Log.d("EncryptionManager", "encryptWithSoftwareKey: Starting")
            
            // Generate random IV
            val iv = ByteArray(IV_LENGTH_BYTES)
            java.security.SecureRandom().nextBytes(iv)
            Log.d("EncryptionManager", "encryptWithSoftwareKey: Generated IV, length: ${iv.size} bytes")
            
            // Get cipher and apply GCM spec with custom IV
            val cipher = Cipher.getInstance(TRANSFORMATION)
            Log.d("EncryptionManager", "encryptWithSoftwareKey: Cipher instance created: $TRANSFORMATION")
            
            val gcmSpec = GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv)
            Log.d("EncryptionManager", "encryptWithSoftwareKey: GCMParameterSpec created with tag length: $GCM_TAG_LENGTH_BITS")
            
            val secretKey = getMasterKey()
            Log.d("EncryptionManager", "encryptWithSoftwareKey: Master key retrieved")
            
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, gcmSpec)
            Log.d("EncryptionManager", "encryptWithSoftwareKey: Cipher initialized with ENCRYPT_MODE and custom IV")
            
            // Encrypt data
            val ciphertext = cipher.doFinal(dataToEncrypt)
            Log.d("EncryptionManager", "encryptWithSoftwareKey: Encryption completed, ciphertext size: ${ciphertext.size} bytes")
            
            // Combine IV + ciphertext and Base64 encode
            val encryptedData = iv + ciphertext
            Log.d("EncryptionManager", "encryptWithSoftwareKey: Combined IV+ciphertext, total size: ${encryptedData.size} bytes")
            
            val encoded = Base64.encodeToString(encryptedData, Base64.NO_WRAP)
            Log.d("EncryptionManager", "encryptWithSoftwareKey: Base64 encoded, result size: ${encoded.length} characters")
            Log.i("EncryptionManager", "encryptWithSoftwareKey: Encryption successful")
            return encoded
        } catch (e: Exception) {
            Log.e("EncryptionManager", "encryptWithSoftwareKey: Encryption failed - ${e.javaClass.simpleName}: ${e.message}", e)
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
        Log.i("EncryptionManager", "decryptString: Starting decryption")
        Log.d("EncryptionManager", "decryptString: Encrypted string length: ${encryptedString.length} characters")
        
        val isHardwareBacked = determineKeyType()
        Log.i("EncryptionManager", "decryptString: Using ${if (isHardwareBacked) "hardware-backed" else "software-backed"} decryption")
        
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
            Log.d("EncryptionManager", "decryptWithHardwareKey: Starting")
            val encryptedData = Base64.decode(encryptedString, Base64.NO_WRAP)
            Log.d("EncryptionManager", "decryptWithHardwareKey: Base64 decoded, size: ${encryptedData.size} bytes")
            
            // Extract IV and ciphertext
            if (encryptedData.size < IV_LENGTH_BYTES) {
                throw IllegalArgumentException("Encrypted data too short: missing IV")
            }
            
            val iv = encryptedData.sliceArray(0 until IV_LENGTH_BYTES)
            Log.d("EncryptionManager", "decryptWithHardwareKey: Extracted IV, size: ${iv.size} bytes")
            
            val ciphertext = encryptedData.sliceArray(IV_LENGTH_BYTES until encryptedData.size)
            Log.d("EncryptionManager", "decryptWithHardwareKey: Extracted ciphertext, size: ${ciphertext.size} bytes")
            
            // Initialize cipher with the extracted IV
            val cipher = Cipher.getInstance(TRANSFORMATION)
            Log.d("EncryptionManager", "decryptWithHardwareKey: Cipher instance created")
            
            val gcmSpec = GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv)
            Log.d("EncryptionManager", "decryptWithHardwareKey: GCMParameterSpec created with IV and tag length: $GCM_TAG_LENGTH_BITS")
            
            val secretKey = getMasterKey()
            Log.d("EncryptionManager", "decryptWithHardwareKey: Master key retrieved")
            
            cipher.init(Cipher.DECRYPT_MODE, secretKey, gcmSpec)
            Log.d("EncryptionManager", "decryptWithHardwareKey: Cipher initialized with extracted IV")
            
            val plaintext = cipher.doFinal(ciphertext)
            Log.d("EncryptionManager", "decryptWithHardwareKey: Decryption completed, plaintext size: ${plaintext.size} bytes")
            
            val result = String(plaintext, Charsets.UTF_8)
            Log.i("EncryptionManager", "decryptWithHardwareKey: Decryption successful")
            return result
        } catch (e: Exception) {
            Log.e("EncryptionManager", "decryptWithHardwareKey: Decryption failed - ${e.javaClass.simpleName}: ${e.message}", e)
            throw Exception("Hardware-backed decryption failed: ${e.message}", e)
        }
    }

    /**
     * Decrypts using software-backed key with caller-managed IV.
     */
    private fun decryptWithSoftwareKey(encryptedString: String): String {
        try {
            Log.d("EncryptionManager", "decryptWithSoftwareKey: Starting")
            // Decode from Base64
            val encryptedData = Base64.decode(encryptedString, Base64.NO_WRAP)
            Log.d("EncryptionManager", "decryptWithSoftwareKey: Base64 decoded, size: ${encryptedData.size} bytes")
            
            // Extract IV and ciphertext
            if (encryptedData.size < IV_LENGTH_BYTES) {
                throw IllegalArgumentException("Encrypted data too short: missing IV")
            }
            
            val iv = encryptedData.sliceArray(0 until IV_LENGTH_BYTES)
            Log.d("EncryptionManager", "decryptWithSoftwareKey: Extracted IV, size: ${iv.size} bytes")
            
            val ciphertext = encryptedData.sliceArray(IV_LENGTH_BYTES until encryptedData.size)
            Log.d("EncryptionManager", "decryptWithSoftwareKey: Extracted ciphertext, size: ${ciphertext.size} bytes")
            
            // Initialize cipher with IV
            val cipher = Cipher.getInstance(TRANSFORMATION)
            Log.d("EncryptionManager", "decryptWithSoftwareKey: Cipher instance created")
            
            val gcmSpec = GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv)
            Log.d("EncryptionManager", "decryptWithSoftwareKey: GCMParameterSpec created with tag length: $GCM_TAG_LENGTH_BITS")
            
            val secretKey = getMasterKey()
            Log.d("EncryptionManager", "decryptWithSoftwareKey: Master key retrieved")
            
            cipher.init(Cipher.DECRYPT_MODE, secretKey, gcmSpec)
            Log.d("EncryptionManager", "decryptWithSoftwareKey: Cipher initialized with custom IV")
            
            // Decrypt
            val plaintext = cipher.doFinal(ciphertext)
            Log.d("EncryptionManager", "decryptWithSoftwareKey: Decryption completed, plaintext size: ${plaintext.size} bytes")
            
            val result = String(plaintext, Charsets.UTF_8)
            Log.i("EncryptionManager", "decryptWithSoftwareKey: Decryption successful")
            return result
        } catch (e: Exception) {
            Log.e("EncryptionManager", "decryptWithSoftwareKey: Decryption failed - ${e.javaClass.simpleName}: ${e.message}", e)
            throw Exception("Software-backed decryption failed: ${e.message}", e)
        }
    }

    /**
     * Retrieves or generates the master key from Android Keystore.
     *
     * @return AES-256 SecretKey stored in Android Keystore
     */
    private fun getMasterKey(): SecretKey {
        Log.i("EncryptionManager", "Getting master key")
        // Check if key already exists
        val existingKey = keyStore.getKey(MASTER_KEY_ALIAS, null)
        if (existingKey is SecretKey) {
            Log.i("EncryptionManager", "Using existing master key (not generating new one)")
            Log.d("EncryptionManager", "Existing key class: ${existingKey.javaClass.name}")
            Log.d("EncryptionManager", "Existing key algorithm: ${existingKey.algorithm}")
            return existingKey
        }
        
        Log.i("EncryptionManager", "No existing key found, generating new master key")
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
        Log.i("EncryptionManager", "Attempting to generate master key")
        val keyGenerator = KeyGenerator.getInstance(ALGORITHM, KEYSTORE_PROVIDER)
        Log.d("EncryptionManager", "KeyGenerator instance created: Algorithm=$ALGORITHM, Provider=$KEYSTORE_PROVIDER")
        
        try {
            Log.i("EncryptionManager", "Trying hardware-backed (StrongBox) keystore")
            // attempt hardware-backed keystore first
            val keySpec = KeyGenParameterSpec.Builder(
                MASTER_KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
            ).apply {
                setKeySize(KEY_SIZE)
                setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                setIsStrongBoxBacked(true)
                Log.d("EncryptionManager", "KeySpec: StrongBox=true, KeySize=$KEY_SIZE, Padding=None, BlockMode=GCM")
            }.build()

            keyGenerator.init(keySpec)
            Log.d("EncryptionManager", "KeyGenerator initialized with hardware spec")
            
            val key = keyGenerator.generateKey()
            Log.i("EncryptionManager", "Generated hardware-backed (StrongBox) key successfully")
            return key
        } catch (e: Exception) {
            Log.w("EncryptionManager", "Hardware-backed keystore not available or failed: ${e.javaClass.simpleName}: ${e.message}", e)
            // fallback to software-backed keystore if hardware is not available
            try {
                Log.i("EncryptionManager", "Retrying with software-backed keystore")
                val keySpec = KeyGenParameterSpec.Builder(
                    MASTER_KEY_ALIAS,
                    KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
                ).apply {
                    setKeySize(KEY_SIZE)
                    setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                    setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                    setIsStrongBoxBacked(false)
                    Log.d("EncryptionManager", "KeySpec: StrongBox=false, KeySize=$KEY_SIZE, Padding=None, BlockMode=GCM")
                }.build()
                
                keyGenerator.init(keySpec)
                Log.d("EncryptionManager", "KeyGenerator initialized with software spec")
                
                val key = keyGenerator.generateKey()
                Log.i("EncryptionManager", "Generated software-backed key successfully")
                return key
            } catch (fallbackE: Exception) {
                Log.e("EncryptionManager", "Failed to generate key with both hardware and software-backed keystores", fallbackE)
                throw Exception("Failed to generate encryption key: ${fallbackE.message}", fallbackE)
            }
        }
    }
}
