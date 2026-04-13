package com.okta.webcryptobridge

import android.os.Build
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyPermanentlyInvalidatedException
import android.security.keystore.KeyProperties
import android.util.Base64
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
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
import java.security.SecureRandom
import java.security.PrivateKey
import java.security.Signature
import java.security.interfaces.RSAPublicKey
import java.security.spec.RSAPublicKeySpec
import java.util.UUID

/**
 * React Native TurboModule that bridges the WebCrypto API to Android platform cryptography.
 *
 * Generated keys are stored in the Android Keystore (hardware-backed, non-extractable).
 * Signing operations require user authentication via biometric prompt or device credential (PIN/pattern/password).
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
        private const val KS_PREFIX = "ks:"
        private const val IM_PREFIX = "im:"
        /** In-memory store for imported external public keys (e.g., from JWKS endpoints). */
        private val importedKeys = mutableMapOf<String, java.security.PublicKey>()
        /** Tracks the authenticator type (biometric/device credential) used when each Keystore key was created. */
        private val keyAuthTypes = mutableMapOf<String, Int>()
    }

    private val secureRandom = SecureRandom()

    private val keyStore: KeyStore by lazy {
        KeyStore.getInstance("AndroidKeyStore").apply {
            load { null }
        }
    }

    override fun getName(): String = NAME

    // MARK: - Key ID helpers

    private fun isKeystoreKey(keyId: String): Boolean = keyId.startsWith(KS_PREFIX)

    private fun keystoreAlias(keyId: String): String = keyId.removePrefix(KS_PREFIX)

    private fun importedId(keyId: String): String = keyId.removePrefix(IM_PREFIX)

    // MARK: - Base64 helpers

    /**
     * Strips the leading zero byte from a [BigInteger] byte representation.
     * [BigInteger.toByteArray] prepends a zero byte to positive values whose high bit is set;
     * JWK fields (`n`, `e`) must not include it.
     */
    private fun toUnsignedByteArray(value: BigInteger): ByteArray {
        val bytes = value.toByteArray()
        return if (bytes[0].toInt() == 0 && bytes.size > 1) {
            bytes.copyOfRange(1, bytes.size)
        } else {
            bytes
        }
    }

    /** Encodes [data] as a Base64URL string (RFC 4648 §5) with no padding. */
    private fun base64URLEncode(data: ByteArray): String =
        Base64.encodeToString(data, Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING)

    /** Decodes a Base64URL string (RFC 4648 §5) to a [ByteArray]. */
    private fun base64URLDecode(input: String): ByteArray =
        Base64.decode(input, Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING)

    // MARK: - Public key resolution

    /**
     * Resolves the [RSAPublicKey] for a given [keyId].
     *
     * For Keystore keys (`ks:` prefix), the public key is extracted from the self-signed certificate.
     * For imported keys (`im:` prefix), the public key is retrieved from the in-memory store.
     *
     * @param keyId the prefixed key identifier
     * @return the [RSAPublicKey], or `null` if the key is not found
     */
    private fun resolvePublicKey(keyId: String): RSAPublicKey? {
        return if (isKeystoreKey(keyId)) {
            val alias = keystoreAlias(keyId)
            val cert = keyStore.getCertificate(alias) ?: return null
            cert.publicKey as? RSAPublicKey
        } else {
            val id = importedId(keyId)
            synchronized(importedKeys) { importedKeys[id] } as? RSAPublicKey
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
     * Generates an RSA 2048-bit key pair in the Android Keystore.
     *
     * The key is hardware-backed and non-extractable. When `"sign"` is included in [keyUsages],
     * user authentication is required for signing operations. The method checks device capability
     * and prefers `BIOMETRIC_STRONG`; if unavailable, it falls back to `BIOMETRIC_STRONG | DEVICE_CREDENTIAL`.
     *
     * @param algorithmJson JSON string with `name` (`"RSASSA-PKCS1-v1_5"`) and `modulusLength` (`2048`)
     * @param extractable ignored; Keystore private keys are never extractable
     * @param keyUsages array of usages: `"sign"`, `"verify"`, or both. Determines the Keystore key purposes
     *                  and whether biometric/device credential authentication is configured
     * @param promise resolves with a JSON string `{"id": "ks:{uuid}"}`, or rejects with:
     *   - `unsupported_algorithm` — algorithm name is not `RSASSA-PKCS1-v1_5`
     *   - `invalid_modulus` — modulus length is not 2048
     *   - `invalid_key_usages` — empty or contains values other than `sign`/`verify`
     *   - `auth_unavailable` — neither biometric nor device credential is available on the device
     *   - `key_generation_failed` — Keystore key generation failed
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
            if (algorithm.getString("name") != "RSASSA-PKCS1-v1_5") {
                promise.reject("unsupported_algorithm", "Only RSASSA-PKCS1-v1_5 is supported")
                return
            }

            val modulusLength = algorithm.getInt("modulusLength")
            if (modulusLength != 2048) {
                promise.reject("invalid_modulus", "Only 2048-bit keys are supported")
                return
            }

            val usages = (0 until keyUsages.size()).map { keyUsages.getString(it) }.toSet()
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

            val authenticators = if ("sign" in usages) {
                val biometricManager = BiometricManager.from(reactApplicationContext)
                val strongResult = biometricManager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG)
                if (strongResult == BiometricManager.BIOMETRIC_SUCCESS) {
                    BiometricManager.Authenticators.BIOMETRIC_STRONG
                } else {
                    val fallbackResult = biometricManager.canAuthenticate(
                        BiometricManager.Authenticators.BIOMETRIC_STRONG or BiometricManager.Authenticators.DEVICE_CREDENTIAL
                    )
                    if (fallbackResult == BiometricManager.BIOMETRIC_SUCCESS) {
                        BiometricManager.Authenticators.BIOMETRIC_STRONG or BiometricManager.Authenticators.DEVICE_CREDENTIAL
                    } else {
                        promise.reject("auth_unavailable", "Neither biometric nor device credential authentication is available")
                        return
                    }
                }
            } else {
                0
            }

            val alias = UUID.randomUUID().toString()

            val specBuilder = KeyGenParameterSpec.Builder(alias, purposes)
                .setKeySize(2048)
                .setDigests(KeyProperties.DIGEST_SHA256)
                .setSignaturePaddings(KeyProperties.SIGNATURE_PADDING_RSA_PKCS1)

            if ("sign" in usages) {
                specBuilder.setUserAuthenticationRequired(true)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    val authType = if (authenticators == BiometricManager.Authenticators.BIOMETRIC_STRONG) {
                        KeyProperties.AUTH_BIOMETRIC_STRONG
                    } else {
                        KeyProperties.AUTH_BIOMETRIC_STRONG or KeyProperties.AUTH_DEVICE_CREDENTIAL
                    }
                    specBuilder.setUserAuthenticationParameters(0, authType)
                } else {
                    if (authenticators and BiometricManager.Authenticators.DEVICE_CREDENTIAL != 0) {
                        specBuilder.setUserAuthenticationValidityDurationSeconds(0)
                    } else {
                        specBuilder.setUserAuthenticationValidityDurationSeconds(-1)
                    }
                }
            }

            synchronized(keyAuthTypes) {
                keyAuthTypes[alias] = authenticators
            }

            val keyPairGenerator = KeyPairGenerator.getInstance(
                KeyProperties.KEY_ALGORITHM_RSA,
                "AndroidKeyStore"
            )
            keyPairGenerator.initialize(specBuilder.build())
            keyPairGenerator.generateKeyPair()

            val keyId = "$KS_PREFIX$alias"
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
     * Used in DPoP flows to embed the public key in JWT headers.
     *
     * @param format export format; only `"jwk"` is supported
     * @param keyId the prefixed key identifier (e.g., `"ks:{uuid}"` or `"im:{uuid}"`)
     * @param keyType unused; public key is always exported
     * @param promise resolves with a JSON string containing `kty`, `alg`, `n`, and `e` fields, or rejects with:
     *   - `unsupported_format` — format is not `"jwk"`
     *   - `key_not_found` — no key exists for the given [keyId]
     *   - `export_failed` — key export failed
     */
    @ReactMethod
    fun exportKey(
        format: String,
        keyId: String,
        keyType: String,
        promise: Promise
    ) {
        runCatching {
            if (format != "jwk") {
                promise.reject("unsupported_format", "Only JWK format is supported")
                return
            }

            val rsaPublicKey = resolvePublicKey(keyId)
            if (rsaPublicKey == null) {
                promise.reject("key_not_found", "Key not found")
                return
            }

            val jwk = JSONObject()
            jwk.put("kty", "RSA")
            jwk.put("alg", "RS256")
            jwk.put("n", base64URLEncode(toUnsignedByteArray(rsaPublicKey.modulus)))
            jwk.put("e", base64URLEncode(toUnsignedByteArray(rsaPublicKey.publicExponent)))

            promise.resolve(jwk.toString())
        }.onFailure { e ->
            promise.reject("export_failed", e?.message, e as? Exception)
        }
    }

    /**
     * Imports an external RSA public key from JWK format into the in-memory key store.
     *
     * Used to import server public keys (e.g., from a JWKS endpoint) for signature verification.
     * Imported keys are public-only and do not require biometric authentication.
     *
     * @param format import format; only `"jwk"` is supported
     * @param keyDataJson JSON string containing JWK fields (`kty`, `n`, `e`)
     * @param algorithmJson JSON string with algorithm metadata; currently unused for import
     * @param extractable unused; imported public keys are always accessible
     * @param keyUsages array of intended usages; currently unused for import
     * @param promise resolves with the key identifier string `"im:{uuid}"`, or rejects with:
     *   - `unsupported_format` — format is not `"jwk"`
     *   - `unsupported_key_type` — `kty` is not `"RSA"`
     *   - `import_failed` — key reconstruction failed
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

            if (kty != "RSA") {
                promise.reject("unsupported_key_type", "Only RSA keys are supported")
                return
            }

            val nString = jwk.getString("n")
            val eString = jwk.getString("e")

            val modulusBytes = base64URLDecode(nString)
            val exponentBytes = base64URLDecode(eString)

            val modulus = BigInteger(1, modulusBytes)
            val exponent = BigInteger(1, exponentBytes)

            val keyFactory = java.security.KeyFactory.getInstance("RSA")
            val keySpec = RSAPublicKeySpec(modulus, exponent)
            val publicKey = keyFactory.generatePublic(keySpec)

            val id = UUID.randomUUID().toString()
            synchronized(importedKeys) {
                importedKeys[id] = publicKey
            }

            promise.resolve("$IM_PREFIX$id")
        }.onFailure { e ->
            promise.reject("import_failed", e?.message, e as? Exception)
        }
    }

    /**
     * Signs data using a Keystore-managed private key with biometric/device credential authentication.
     *
     * Loads the private key from Android Keystore, initializes a SHA256withRSA [Signature],
     * wraps it in a [BiometricPrompt.CryptoObject], and presents a biometric prompt to the user.
     * After successful authentication, the authenticated [Signature] is used to sign the data.
     *
     * The biometric prompt title and description can be customized via optional fields in [algorithmJson]:
     * - `promptTitle` — the title shown on the biometric dialog (default: `"Authenticate to sign"`)
     * - `promptDescription` — the description shown on the biometric dialog (default: `"Authentication is required to sign data"`)
     *
     * @param algorithmJson JSON string with algorithm metadata and optional `promptTitle`/`promptDescription`
     * @param keyId the Keystore key identifier (must have `"ks:"` prefix)
     * @param data standard Base64-encoded data to sign
     * @param promise resolves with the standard Base64-encoded signature, or rejects with:
     *   - `key_not_found` — key is an imported public key or doesn't exist in Keystore
     *   - `key_invalidated` — key was permanently invalidated (e.g., biometric enrollment changed)
     *   - `no_activity` — no [FragmentActivity] available for showing the biometric prompt
     *   - `biometric_error` — user cancelled or biometric authentication failed
     *   - `signing_failed` — signing failed after authentication
     */
    @ReactMethod
    fun sign(
        algorithmJson: String,
        keyId: String,
        data: String,
        promise: Promise
    ) {
        val algorithmOptions = runCatching { JSONObject(algorithmJson) }.getOrElse { JSONObject() }
        val promptTitle = algorithmOptions.optString("promptTitle", "Authenticate to sign")
        val promptDescription = algorithmOptions.optString("promptDescription", "Authentication is required to sign data")

        if (!isKeystoreKey(keyId)) {
            promise.reject("key_not_found", "Private key not available for imported keys")
            return
        }

        val alias = keystoreAlias(keyId)
        val inputData = runCatching {
            Base64.decode(data, Base64.NO_WRAP)
        }.getOrElse { e ->
            promise.reject("signing_failed", "Invalid base64 data", e as? Exception)
            return
        }

        val privateKey: PrivateKey = runCatching {
            keyStore.getKey(alias, null) as PrivateKey
        }.getOrElse { e ->
            if (e is KeyPermanentlyInvalidatedException) {
                keyStore.deleteEntry(alias)
                promise.reject("key_invalidated", "Key has been permanently invalidated. Please generate a new key.", e)
            } else {
                promise.reject("key_not_found", "Key not found in Keystore", e as? Exception)
            }
            return
        }

        val signature: Signature = runCatching {
            Signature.getInstance("SHA256withRSA").apply {
                initSign(privateKey)
                update(inputData)
            }
        }.getOrElse { e ->
            if (e is KeyPermanentlyInvalidatedException) {
                keyStore.deleteEntry(alias)
                promise.reject("key_invalidated", "Key has been permanently invalidated. Please generate a new key.", e)
            } else {
                promise.reject("signing_failed", "Failed to initialize signature", e as? Exception)
            }
            return
        }

        val activity = reactApplicationContext.currentActivity as? FragmentActivity
        if (activity == null) {
            promise.reject("no_activity", "No FragmentActivity available for biometric prompt")
            return
        }

        val authenticators = synchronized(keyAuthTypes) { keyAuthTypes[alias] }
            ?: BiometricManager.Authenticators.BIOMETRIC_STRONG

        activity.runOnUiThread {
            try {
                val executor = ContextCompat.getMainExecutor(activity)
                val cryptoObject = BiometricPrompt.CryptoObject(signature)

                val promptBuilder = BiometricPrompt.PromptInfo.Builder()
                    .setTitle(promptTitle)
                    .setDescription(promptDescription)
                    .setAllowedAuthenticators(authenticators)

                if (authenticators and BiometricManager.Authenticators.DEVICE_CREDENTIAL == 0) {
                    promptBuilder.setNegativeButtonText("Cancel")
                }

                val promptInfo = promptBuilder.build()

                val biometricPrompt = BiometricPrompt(
                    activity,
                    executor,
                    object : BiometricPrompt.AuthenticationCallback() {
                        override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                            promise.reject(
                                "biometric_error",
                                "Biometric authentication error ($errorCode): $errString"
                            )
                        }

                        override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                            try {
                                val authedSignature = result.cryptoObject?.signature
                                    ?: throw IllegalStateException("CryptoObject signature is null after authentication")
                                val signatureBytes = authedSignature.sign()
                                promise.resolve(Base64.encodeToString(signatureBytes, Base64.NO_WRAP))
                            } catch (e: Exception) {
                                promise.reject("signing_failed", "Failed to sign data after authentication", e)
                            }
                        }

                        override fun onAuthenticationFailed() {
                            // BiometricPrompt handles retry internally; this is called on
                            // each failed attempt but the prompt stays open.
                        }
                    }
                )

                biometricPrompt.authenticate(promptInfo, cryptoObject)
            } catch (e: Exception) {
                promise.reject("biometric_error", "Failed to show biometric prompt", e)
            }
        }
    }

    /**
     * Verifies an RSA signature against the provided data using SHA256withRSA.
     *
     * Works for both Keystore-managed keys and imported public keys.
     * Does not require biometric authentication.
     *
     * @param algorithmJson JSON string with algorithm metadata; currently unused
     * @param keyId the prefixed key identifier (e.g., `"ks:{uuid}"` or `"im:{uuid}"`)
     * @param signatureBase64 standard Base64-encoded signature to verify
     * @param data standard Base64-encoded data that was signed
     * @param promise resolves with `true` if the signature is valid, `false` otherwise, or rejects with:
     *   - `key_not_found` — no key exists for the given [keyId]
     *   - `verification_failed` — signature verification encountered an error
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
            val publicKey = resolvePublicKey(keyId)
            if (publicKey == null) {
                promise.reject("key_not_found", "Key not found")
                return
            }

            val inputData = Base64.decode(data, Base64.NO_WRAP)
            val signatureBytes = Base64.decode(signatureBase64, Base64.NO_WRAP)

            val signature = Signature.getInstance("SHA256withRSA")
            signature.initVerify(publicKey)
            signature.update(inputData)
            val verified = signature.verify(signatureBytes)

            promise.resolve(verified)
        }.onFailure { e ->
            promise.reject("verification_failed", "Failed to verify signature", e as? Exception)
        }
    }
}
