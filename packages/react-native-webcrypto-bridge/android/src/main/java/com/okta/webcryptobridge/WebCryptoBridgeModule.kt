package com.okta.webcryptobridge

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyPermanentlyInvalidatedException
import android.security.keystore.KeyProperties
import android.util.Base64
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.module.annotations.ReactModule
import org.json.JSONObject
import java.math.BigInteger
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.MessageDigest
import java.security.PublicKey
import java.security.SecureRandom
import java.security.PrivateKey
import java.security.Signature
import java.security.interfaces.RSAPublicKey
import java.security.spec.RSAPublicKeySpec
import java.util.UUID

/**
 * Sealed class representing where and how a cryptographic key is stored.
 * The extractability of a key determines its storage mechanism:
 * - Non-extractable keys use Android Keystore (hardware-backed)
 * - Extractable keys use native in-memory storage
 */
sealed class NativeCryptoKey {
    /** Non-extractable key stored in Android Keystore at the given alias */
    data class Keystore(val alias: String) : NativeCryptoKey()

    /** Extractable key stored in memory (imported or generated) */
    data class Platform(
        val key: PublicKey,         // Generic, not RSA-specific
        val algorithmName: String   // Track which algorithm this key uses
    ) : NativeCryptoKey()
}

/**
 * Represents a cryptographic key that mimics the NodeJS WebCrypto API's CryptoKey interface.
 *
 * This class encapsulates key metadata (algorithm, type, extractable, usages) along with
 * a reference to where the key is stored. It bridges between the WebCrypto
 * JavaScript API and Android's native cryptographic APIs.
 *
 * @property algorithm JSON object containing the key algorithm (e.g., `{"name": "RSASSA-PKCS1-v1_5", "modulusLength": 2048}`)
 * @property type the key type: `"private"`, `"public"`, or `"secret"`
 * @property extractable whether the key can be exported
 * @property usages array of permitted operations: `"sign"`, `"verify"`, etc.
 * @property entry the storage mechanism for the key (Keystore or Platform)
 */
data class CryptoKey(
    val algorithm: JSONObject,
    val type: String,
    val extractable: Boolean,
    val usages: List<String>,
    val entry: NativeCryptoKey
)

/**
 * React Native TurboModule that bridges the WebCrypto API to Android platform cryptography.
 *
 * Generated keys are stored in the Android Keystore (hardware-backed, non-extractable).
 * Imported public keys (from external JWKS endpoints) are held in memory for signature verification.
 *
 * Key ID scheme:
 * - `ks:{uuid}` — Keystore-managed keys (generated via [generateKey])
 * - `im:{uuid}` — In-memory imported public keys (imported via [importKey])
 */
@ReactModule(name = WebCryptoBridgeModule.NAME)
class WebCryptoBridgeModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "WebCryptoBridge"
    }

    private val cryptoKeys = mutableMapOf<String, CryptoKey>()
    private val secureRandom = SecureRandom()

    override fun getName(): String = NAME

    private val keyStore: KeyStore by lazy {
      KeyStore.getInstance("AndroidKeyStore").apply {
          load { null }
      }
    }

    // MARK: - Key resolution helpers

    /**
     * Resolves a CryptoKey from the key map by its prefixed ID.
     *
     * @param keyId the prefixed key identifier (e.g., "ks:{uuid}" or "im:{uuid}")
     * @return the CryptoKey metadata, or null if not found
     */
    private fun getCryptoKeyEntry(keyId: String): CryptoKey? {
        return synchronized(cryptoKeys) { cryptoKeys[keyId] }
    }

    /**
     * Resolves the actual cryptographic key from a CryptoKey's entry.
     *
     * Returns the native key object needed for cryptographic operations:
     * - For Keystore entries: extracts PublicKey from the certificate
     * - For Platform entries: returns the stored key object
     *
     * @param cryptoKey the CryptoKey containing the entry
     * @param keyId the prefixed key identifier (needed for Keystore access)
     * @return the PublicKey, or null if not found
     */
    private fun resolveNativeKey(cryptoKey: CryptoKey, keyId: String): PublicKey? {
        return when (val entry = cryptoKey.entry) {
            is NativeCryptoKey.Keystore -> {
                val cert = keyStore.getCertificate(entry.alias)
                cert?.publicKey as? PublicKey
            }
            is NativeCryptoKey.Platform -> entry.key
        }
    }

    // MARK: - Synchronous Methods

    /**
     * Generates cryptographically secure random bytes.
     *
     * @param length number of random bytes to generate
     * @return standard Base64-encoded random bytes
     */
    @ReactMethod(isBlockingSynchronousMethod = true)
    fun getRandomValues(length: Double): String {
        val len = length.toInt()
        val bytes = ByteArray(len)
        secureRandom.nextBytes(bytes)
        return Base64.encodeToString(bytes, Base64.NO_WRAP)
    }

    /**
     * Generates a random UUID v4 string.
     *
     * @return a UUID v4 string (e.g., `"550e8400-e29b-41d4-a716-446655440000"`)
     */
    @ReactMethod(isBlockingSynchronousMethod = true)
    fun randomUUID(): String {
        return UUID.randomUUID().toString()
    }

    // MARK: - Async Methods

    /**
     * Computes a SHA-256 digest of the provided data.
     *
     * @param algorithm the hash algorithm name; only `"SHA-256"` is supported
     * @param data standard Base64-encoded input data
     * @param promise resolves with the standard Base64-encoded digest, or rejects on error
     */
    @ReactMethod
    fun digest(
        algorithm: String,
        data: String,
        promise: Promise
    ) {
        runCatching {
            if (algorithm != "SHA-256") {
                promise.reject("unsupported_algorithm", "Only SHA-256 is supported")
                return
            }
            val inputData = Base64.decode(data, Base64.NO_WRAP)
            val digest = MessageDigest.getInstance("SHA-256")
            val hash = digest.digest(inputData)
            promise.resolve(Base64.encodeToString(hash, Base64.NO_WRAP))
        }.onFailure { e ->
            promise.reject("digest_failed", "Failed to compute digest", e as? Exception)
        }
    }

    /**
     * Generates a key pair for the specified algorithm in the Android Keystore.
     *
     * The key is hardware-backed and non-extractable. Algorithm-specific validation and
     * key spec generation is delegated to the appropriate CryptoAlgorithmHandler.
     *
     * @param algorithmJson JSON string containing algorithm metadata
     * @param extractable ignored; Keystore private keys are never extractable
     * @param keyUsages array of usages: `"sign"`, `"verify"`, or both
     * @param promise resolves with a JSON string `{"id": "ks:{uuid}"}`, or rejects on error
     */
    @ReactMethod
    fun generateKey(
        algorithmJson: String,
        extractable: Boolean,
        keyUsages: ReadableArray,
        promise: Promise
    ) {
        runCatching {
            val algorithm = JSONObject(algorithmJson)
            val algorithmName = algorithm.getString("name")

            // Get handler for this algorithm
            val handler = CryptoAlgorithmRegistry.getHandler(algorithmName)
            if (handler == null) {
                promise.reject("unsupported_algorithm", "Algorithm not supported: $algorithmName")
                return
            }

            val usages = (0 until keyUsages.size()).mapNotNull { keyUsages.getString(it) }.toSet()
            val allowedUsages = setOf("sign", "verify")
            val invalid = usages - allowedUsages
            if (invalid.isNotEmpty()) {
                promise.reject("invalid_key_usages", "Invalid key usages: $invalid. Allowed: $allowedUsages")
                return
            }
            if (usages.isEmpty()) {
                promise.reject("invalid_key_usages", "At least one key usage must be specified")
                return
            }

            var purposes = 0
            if ("sign" in usages) purposes = purposes or KeyProperties.PURPOSE_SIGN
            if ("verify" in usages) purposes = purposes or KeyProperties.PURPOSE_VERIFY

            val keyId = UUID.randomUUID().toString()

            // Handler validates parameters and generates spec (throws if invalid)
            val keyGenSpec = try {
                handler.generateKeySpec(keyId, algorithm, purposes)
            } catch (e: IllegalArgumentException) {
                promise.reject("invalid_key_parameters", e.message ?: "Invalid algorithm parameters")
                return
            }

            // Rest of key generation remains the same
            val keyPairGenerator = KeyPairGenerator.getInstance(
                keyGenSpec.keyAlgorithm,
                "AndroidKeyStore"
            )
            keyPairGenerator.initialize(keyGenSpec.keyGenParameterSpec)
            keyPairGenerator.generateKeyPair()

            // Create CryptoKey metadata
            val algorithmObject = JSONObject(algorithmJson)
            val cryptoKey = CryptoKey(
                algorithm = algorithmObject,
                type = "private",
                extractable = extractable,
                usages = usages.toList(),
                entry = NativeCryptoKey.Keystore(keyId)
            )

            synchronized(cryptoKeys) {
                cryptoKeys[keyId] = cryptoKey
            }

            val result = JSONObject().apply {
                put("id", keyId)
            }
            promise.resolve(result.toString())
        }.onFailure { e ->
            promise.reject("key_generation_failed", "Failed to generate key pair", e as? Exception)
        }
    }

    /**
     * Exports the public key of a key pair in JWK (JSON Web Key) format.
     *
     * Works for both Keystore-managed keys and imported public keys.
     * Algorithm-specific JWK export is delegated to the appropriate CryptoAlgorithmHandler.
     *
     * @param format export format; only `"jwk"` is supported
     * @param keyId the prefixed key identifier (e.g., `"ks:{uuid}"` or `"im:{uuid}"`)
     * @param promise resolves with a JSON string containing algorithm-specific JWK fields, or rejects on error
     */
    @ReactMethod
    fun exportKey(
        format: String,
        keyId: String,
        promise: Promise
    ) {
        runCatching {
            if (format != "jwk") {
                promise.reject("unsupported_format", "Only JWK format is supported")
                return
            }

            val cryptoKey = getCryptoKeyEntry(keyId)
            if (cryptoKey == null) {
                promise.reject("key_not_found", "Key not found")
                return
            }

            val nativeKey = resolveNativeKey(cryptoKey, keyId)
            if (nativeKey == null) {
                promise.reject("key_export_failed", "Could not resolve public key")
                return
            }

            // Get handler to export JWK
            val algorithmName = cryptoKey.algorithm.getString("name")
            val handler = CryptoAlgorithmRegistry.getHandler(algorithmName)
            if (handler == null) {
                return promise.reject("unsupported_algorithm", "Algorithm not supported")
            }

            // Handler generates algorithm-specific JWK
            val jwk = handler.exportToJWK(nativeKey)
            promise.resolve(jwk.toString())
        }.onFailure { e ->
            promise.reject("export_failed", e?.message, e as? Exception)
        }
    }

    /**
     * Imports an external public key from JWK format into the in-memory key store.
     *
     * Used to import server public keys (e.g., from a JWKS endpoint) for signature verification.
     * Imported keys are public-only and do not require biometric authentication.
     * Algorithm-specific key reconstruction is delegated to the appropriate CryptoAlgorithmHandler.
     *
     * @param format import format; only `"jwk"` is supported
     * @param keyDataJson JSON string containing JWK fields
     * @param algorithmJson JSON string with algorithm metadata
     * @param extractable unused; imported public keys are always accessible
     * @param keyUsages array of intended usages
     * @param promise resolves with the key identifier string, or rejects on error
     */
    @ReactMethod
    fun importKey(
        format: String,
        keyDataJson: String,
        algorithmJson: String,
        extractable: Boolean,
        keyUsages: ReadableArray,
        promise: Promise
    ) {
        runCatching {
            if (format != "jwk") {
                promise.reject("unsupported_format", "Only JWK format is supported")
                return
            }

            val jwk = JSONObject(keyDataJson)
            val kty = jwk.getString("kty")

            // Get handler based on key type
            val handler = CryptoAlgorithmRegistry.getHandlerByKeyType(kty)
            if (handler == null) {
                return promise.reject("unsupported_key_type", "Key type not supported: $kty")
            }

            // Handler imports from JWK
            val publicKey = handler.importFromJWK(jwk)
            val algorithmName = CryptoAlgorithmRegistry.getAlgorithmNameByKeyType(kty) ?: "unknown"

            val keyId = UUID.randomUUID().toString()

            // Parse key usages from ReadableArray
            val usages = (0 until keyUsages.size()).mapNotNull { keyUsages.getString(it) }

            // Create CryptoKey metadata
            val algorithm = JSONObject(algorithmJson)
            val cryptoKey = CryptoKey(
                algorithm = algorithm,
                type = "public",
                extractable = extractable,
                usages = usages,
                entry = NativeCryptoKey.Platform(publicKey, algorithmName)
            )

            synchronized(cryptoKeys) {
                cryptoKeys[keyId] = cryptoKey
            }

            promise.resolve(keyId)
        }.onFailure { e ->
            promise.reject("import_failed", e?.message, e as? Exception)
        }
    }

    /**
     * Signs data using a Keystore-managed private key.
     *
     * Loads the private key from Android Keystore and signs using the signature algorithm
     * determined by the CryptoAlgorithmHandler for this algorithm.
     *
     * @param algorithmJson JSON string with algorithm metadata
     * @param keyId the Keystore key identifier
     * @param data standard Base64-encoded data to sign
     * @param promise resolves with the standard Base64-encoded signature, or rejects on error
     */
    @ReactMethod
    fun sign(
        algorithmJson: String,
        keyId: String,
        data: String,
        promise: Promise
    ) {
        runCatching {
            val inputData = Base64.decode(data, Base64.NO_WRAP)

            val cryptoKey = getCryptoKeyEntry(keyId)
            if (cryptoKey == null) {
                promise.reject("key_not_found", "Key not found")
                return
            }
            if ("sign" !in cryptoKey.usages) {
                promise.reject("invalid_access_error", "usage does not contain `sign`")
                return
            }

            // Get handler to determine signature algorithm
            val algorithmName = cryptoKey.algorithm.getString("name")
            val handler = CryptoAlgorithmRegistry.getHandler(algorithmName)
            if (handler == null) {
                return promise.reject("unsupported_algorithm", "Algorithm not supported")
            }

            // Get private key from keystore
            val keystoreAlias = (cryptoKey.entry as? NativeCryptoKey.Keystore)?.alias
            if (keystoreAlias == null) {
                return promise.reject("key_not_found", "Key is not a Keystore key")
            }

            val privateKey: PrivateKey = runCatching {
                keyStore.getKey(keystoreAlias, null) as PrivateKey
            }.getOrElse { e ->
                if (e is KeyPermanentlyInvalidatedException) {
                    keyStore.deleteEntry(keystoreAlias)
                    return promise.reject("key_invalidated", "Key has been permanently invalidated", e)
                } else {
                    return promise.reject("key_not_found", "Key not found in Keystore", e as? Exception)
                }
            }

            // Use handler to get the right signature algorithm
            val signatureAlgorithm = handler.getSignatureAlgorithm()
            val signature = Signature.getInstance(signatureAlgorithm).apply {
                initSign(privateKey)
                update(inputData)
            }

            val signatureBytes = signature.sign()
            promise.resolve(Base64.encodeToString(signatureBytes, Base64.NO_WRAP))
        }.onFailure { e ->
            promise.reject("signing_failed", "Failed to sign data", e as? Exception)
        }
    }

    /**
     * Verifies a signature against the provided data.
     *
     * Works for both Keystore-managed keys and imported public keys.
     * Signature algorithm verification is delegated to the appropriate CryptoAlgorithmHandler.
     *
     * @param algorithmJson JSON string with algorithm metadata
     * @param keyId the prefixed key identifier (e.g., `"ks:{uuid}"` or `"im:{uuid}"`)
     * @param signatureBase64 standard Base64-encoded signature to verify
     * @param data standard Base64-encoded data that was signed
     * @param promise resolves with `true` if the signature is valid, `false` otherwise, or rejects on error
     */
    @ReactMethod
    fun verify(
        algorithmJson: String,
        keyId: String,
        signatureBase64: String,
        data: String,
        promise: Promise
    ) {
        runCatching {
            val cryptoKey = getCryptoKeyEntry(keyId)
            if (cryptoKey == null) {
                promise.reject("key_not_found", "Key not found")
                return
            }
            if ("verify" !in cryptoKey.usages) {
                promise.reject("invalid_access_error", "usage does not contain `verify`")
                return
            }

            // Determine algorithm from key entry
            val algorithmName = when (val entry = cryptoKey.entry) {
                is NativeCryptoKey.Keystore -> cryptoKey.algorithm.getString("name")
                is NativeCryptoKey.Platform -> entry.algorithmName
            }

            val handler = CryptoAlgorithmRegistry.getHandler(algorithmName)
            if (handler == null) {
                return promise.reject("unsupported_algorithm", "Algorithm not supported")
            }

            val nativeKey = resolveNativeKey(cryptoKey, keyId)
            if (nativeKey == null) {
                return promise.reject("verification_failed", "Could not resolve public key")
            }

            val inputData = Base64.decode(data, Base64.NO_WRAP)
            val signatureBytes = Base64.decode(signatureBase64, Base64.NO_WRAP)

            // Use handler to get the right signature algorithm
            val signatureAlgorithm = handler.getSignatureAlgorithm()
            val signature = Signature.getInstance(signatureAlgorithm)
            signature.initVerify(nativeKey)
            signature.update(inputData)
            val verified = signature.verify(signatureBytes)

            promise.resolve(verified)
        }.onFailure { e ->
            promise.reject("verification_failed", "Failed to verify signature", e as? Exception)
        }
    }
}
