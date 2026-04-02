package com.okta.webcryptobridge

import com.facebook.react.bridge.*
import com.facebook.react.module.annotations.ReactModule
import org.json.JSONObject
import java.math.BigInteger
import java.security.*
import java.security.spec.RSAPublicKeySpec
import java.util.*

@ReactModule(name = WebCryptoBridgeModule.NAME)
class WebCryptoBridgeModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "WebCryptoBridge"
        private val keyStore = mutableMapOf<String, KeyPairEntry>()
    }

    data class KeyPairEntry(
        val publicKey: PublicKey,
        val privateKey: PrivateKey?,
        val extractable: Boolean
    )

    override fun getName(): String = NAME

    // MARK: - Helper Methods

    private fun toUnsignedByteArray(value: BigInteger): ByteArray {
        val bytes = value.toByteArray()
        // Remove leading zero byte if present (for positive numbers)
        return if (bytes[0].toInt() == 0 && bytes.size > 1) {
            bytes.copyOfRange(1, bytes.size)
        } else {
            bytes
        }
    }

    private fun base64URLEncode(data: ByteArray): String {
        var base64 = Base64.encodeToString(data, Base64.NO_WRAP)
        base64 = base64.replace('+', '-')
        base64 = base64.replace('/', '_')
        base64 = base64.replace("=", "")
        return base64
    }

    private fun base64URLDecode(input: String): ByteArray {
        var base64 = input.replace('-', '+').replace('_', '/')
        // Add padding
        when (base64.length % 4) {
            2 -> base64 += "=="
            3 -> base64 += "="
        }
        return Base64.decode(base64, Base64.NO_WRAP)
    }

    // MARK: - Synchronous Methods
    
    @ReactMethod(isBlockingSynchronousMethod = true)
    fun getRandomValues(length: Double): String {
        val len = length.toInt()
        val random = SecureRandom()
        val bytes = ByteArray(len)
        random.nextBytes(bytes)
        return Base64.encodeToString(bytes, Base64.NO_WRAP)
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun randomUUID(): String {
        return UUID.randomUUID().toString()
    }

    // MARK: - Async Methods
    
    @ReactMethod
    fun digest(
        algorithm: String,
        data: String,
        promise: Promise
    ) {
        try {
            if (algorithm != "SHA-256") {
                promise.reject("unsupported_algorithm", "Only SHA-256 is supported")
                return
            }

            val inputData = Base64.decode(data, Base64.NO_WRAP)
            val digest = MessageDigest.getInstance("SHA-256")
            val hash = digest.digest(inputData)

            promise.resolve(Base64.encodeToString(hash, Base64.NO_WRAP))
        } catch (e: Exception) {
            promise.reject("digest_failed", "Failed to compute digest", e)
        }
    }

    @ReactMethod
    fun generateKey(
        algorithmJson: String,
        extractable: Boolean,
        keyUsages: ReadableArray,
        promise: Promise
    ) {
        try {
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

            val keyPairGenerator = KeyPairGenerator.getInstance("RSA")
            keyPairGenerator.initialize(2048, SecureRandom())
            val keyPair = keyPairGenerator.generateKeyPair()

            val keyId = UUID.randomUUID().toString()

            synchronized(keyStore) {
                keyStore[keyId] = KeyPairEntry(
                    publicKey = keyPair.public,
                    privateKey = keyPair.private,
                    extractable = extractable
                )
            }

            val result = JSONObject().apply {
                put("id", keyId)
            }

            promise.resolve(result.toString())
        } catch (e: Exception) {
            promise.reject("key_generation_failed", "Failed to generate key pair", e)
        }
    }

    @ReactMethod
    fun exportKey(
        format: String,
        keyId: String,
        keyType: String,
        promise: Promise
    ) {
        try {
            if (format != "jwk") {
                promise.reject("unsupported_format", "Only JWK format is supported")
                return
            }

            val keyPairEntry = synchronized(keyStore) { keyStore[keyId] }
            if (keyPairEntry == null) {
                promise.reject("key_not_found", "Key not found")
                return
            }

            val key = if (keyType == "public") keyPairEntry.publicKey else keyPairEntry.privateKey
            val rsaPublicKey = key as? java.security.interfaces.RSAPublicKey

            if (rsaPublicKey == null) {
                promise.reject("export_failed", "Key is not an RSA public key")
                return
            }

            val jwk = JSONObject()
            jwk.put("kty", "RSA")
            jwk.put("alg", "RS256")
            jwk.put("n", base64URLEncode(toUnsignedByteArray(rsaPublicKey.modulus)))
            jwk.put("e", base64URLEncode(toUnsignedByteArray(rsaPublicKey.publicExponent)))

            promise.resolve(jwk.toString())
        } catch (e: Exception) {
            promise.reject("export_failed", e.message, e)
        }
    }

    @ReactMethod
    fun importKey(
        format: String,
        keyDataJson: String,
        algorithmJson: String,
        extractable: Boolean,
        keyUsages: ReadableArray,
        promise: Promise
    ) {
        try {
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

            val keyFactory = KeyFactory.getInstance("RSA")
            val keySpec = RSAPublicKeySpec(modulus, exponent)
            val publicKey = keyFactory.generatePublic(keySpec)

            val keyId = UUID.randomUUID().toString()
            synchronized(keyStore) {
                keyStore[keyId] = KeyPairEntry(
                    publicKey = publicKey,
                    privateKey = null,
                    extractable = extractable
                )
            }

            promise.resolve(keyId)
        } catch (e: Exception) {
            promise.reject("import_failed", e.message, e)
        }
    }

    @ReactMethod
    fun sign(
        algorithmJson: String,
        keyId: String,
        data: String,
        promise: Promise
    ) {
        try {
            val keyPairEntry = synchronized(keyStore) { keyStore[keyId] }
            if (keyPairEntry == null) {
                promise.reject("key_not_found", "Key not found")
                return
            }

            val privateKey = keyPairEntry.privateKey
            if (privateKey == null) {
                promise.reject("key_not_found", "Private key not available for this key")
                return
            }

            val inputData = Base64.decode(data, Base64.NO_WRAP)

            val signature = Signature.getInstance("SHA256withRSA")
            signature.initSign(privateKey)
            signature.update(inputData)
            val signatureBytes = signature.sign()

            promise.resolve(Base64.encodeToString(signatureBytes, Base64.NO_WRAP))
        } catch (e: Exception) {
            promise.reject("signing_failed", "Failed to sign data", e)
        }
    }

    @ReactMethod
    fun verify(
        algorithmJson: String,
        keyId: String,
        signatureBase64: String,
        data: String,
        promise: Promise
    ) {
        try {
            val keyPairEntry = synchronized(keyStore) { keyStore[keyId] }
            if (keyPairEntry == null) {
                promise.reject("key_not_found", "Key not found")
                return
            }

            val inputData = Base64.decode(data, Base64.NO_WRAP)
            val signatureBytes = Base64.decode(signatureBase64, Base64.NO_WRAP)

            val signature = Signature.getInstance("SHA256withRSA")
            signature.initVerify(keyPairEntry.publicKey)
            signature.update(inputData)
            val verified = signature.verify(signatureBytes)

            promise.resolve(verified)
        } catch (e: Exception) {
            promise.reject("verification_failed", "Failed to verify signature", e)
        }
    }

}
