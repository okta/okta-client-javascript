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
        val privateKey: PrivateKey,
        val extractable: Boolean
    )

    override fun getName(): String = NAME

    // MARK: - Helper Methods
    
    private fun readableArrayToByteArray(array: ReadableArray): ByteArray {
        val bytes = ByteArray(array.size())
        for (i in 0 until array.size()) {
            bytes[i] = array.getInt(i).toByte()
        }
        return bytes
    }

    private fun byteArrayToWritableArray(bytes: ByteArray): WritableArray {
        val array = Arguments.createArray()
        bytes.forEach { array.pushInt(it.toInt() and 0xFF) }
        return array
    }

    private fun toUnsignedByteArray(value: BigInteger): ByteArray {
        val bytes = value.toByteArray()
        // Remove leading zero byte if present (for positive numbers)
        return if (bytes[0].toInt() == 0 && bytes.size > 1) {
            bytes.copyOfRange(1, bytes.size)
        } else {
            bytes
        }
    }

    // MARK: - Synchronous Methods
    
    @ReactMethod(isBlockingSynchronousMethod = true)
    fun getRandomValues(length: Double): WritableArray {
        val len = length.toInt()
        val random = SecureRandom()
        val bytes = ByteArray(len)
        random.nextBytes(bytes)
        return byteArrayToWritableArray(bytes)
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun randomUUID(): String {
        return UUID.randomUUID().toString()
    }

    // MARK: - Async Methods
    
    @ReactMethod
    fun digest(
        algorithm: String,
        data: ReadableArray,
        promise: Promise
    ) {
        try {
            if (algorithm != "SHA-256") {
                promise.reject("unsupported_algorithm", "Only SHA-256 is supported")
                return
            }

            val inputData = readableArrayToByteArray(data)
            val digest = MessageDigest.getInstance("SHA-256")
            val hash = digest.digest(inputData)
            val result = byteArrayToWritableArray(hash)

            promise.resolve(result)
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
            val algorithmName = algorithm.getString("name")

            if (algorithmName != "RSASSA-PKCS1-v1_5") {
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

            val keyPairEntry = keyStore[keyId]
            if (keyPairEntry == null) {
                promise.reject("key_not_found", "Key not found")
                return
            }

            val key = if (keyType == "public") {
                keyPairEntry.publicKey
            } else {
                keyPairEntry.privateKey
            }

            val jwk = when (key) {
                is java.security.interfaces.RSAPublicKey -> {
                    JSONObject().apply {
                        put("kty", "RSA")
                        put("alg", "RS256")
                        put("n", android.util.Base64.encodeToString(
                            toUnsignedByteArray(key.modulus),
                            android.util.Base64.NO_WRAP
                        ))
                        put("e", android.util.Base64.encodeToString(
                            toUnsignedByteArray(key.publicExponent),
                            android.util.Base64.NO_WRAP
                        ))
                    }
                }
                is java.security.interfaces.RSAPrivateKey -> {
                    // For private keys, we need the CRT parameters
                    // This is a simplified version
                    JSONObject().apply {
                        put("kty", "RSA")
                        put("alg", "RS256")
                        put("n", android.util.Base64.encodeToString(
                            toUnsignedByteArray(key.modulus),
                            android.util.Base64.NO_WRAP
                        ))
                        // Private key components would go here in a full implementation
                    }
                }
                else -> {
                    promise.reject("unsupported_key_type", "Unsupported key type")
                    return
                }
            }

            promise.resolve(jwk.toString())
        } catch (e: Exception) {
            promise.reject("export_failed", "Failed to export key", e)
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

            // Decode modulus and exponent from standard base64
            val modulusBytes = android.util.Base64.decode(jwk.getString("n"), android.util.Base64.NO_WRAP)
            val exponentBytes = android.util.Base64.decode(jwk.getString("e"), android.util.Base64.NO_WRAP)
            
            val modulus = BigInteger(1, modulusBytes)
            val exponent = BigInteger(1, exponentBytes)

            // Determine if this is a public or private key
            val keyUsagesList = mutableListOf<String>()
            for (i in 0 until keyUsages.size()) {
                keyUsagesList.add(keyUsages.getString(i) ?: "")
            }
            val isPrivateKey = keyUsagesList.contains("sign")

            val keyFactory = KeyFactory.getInstance("RSA")
            
            if (isPrivateKey) {
                // For private key import, we'd need the private exponent (d)
                promise.reject("not_implemented", "Private key import not yet implemented")
                return
            } else {
                // Import public key
                val keySpec = RSAPublicKeySpec(modulus, exponent)
                val publicKey = keyFactory.generatePublic(keySpec)

                val keyId = UUID.randomUUID().toString()

                synchronized(keyStore) {
                    keyStore[keyId] = KeyPairEntry(
                        publicKey = publicKey,
                        privateKey = publicKey as PrivateKey, // Placeholder - won't be used
                        extractable = extractable
                    )
                }

                promise.resolve(keyId)
            }
        } catch (e: Exception) {
            promise.reject("import_failed", "Failed to import key", e)
        }
    }

    @ReactMethod
    fun sign(
        algorithmJson: String,
        keyId: String,
        data: ReadableArray,
        promise: Promise
    ) {
        try {
            val keyPairEntry = keyStore[keyId]
            if (keyPairEntry == null) {
                promise.reject("key_not_found", "Key not found")
                return
            }

            val inputData = readableArrayToByteArray(data)

            val signature = Signature.getInstance("SHA256withRSA")
            signature.initSign(keyPairEntry.privateKey)
            signature.update(inputData)
            val signatureBytes = signature.sign()

            val result = byteArrayToWritableArray(signatureBytes)
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("signing_failed", "Failed to sign data", e)
        }
    }

    @ReactMethod
    fun verify(
        algorithmJson: String,
        keyId: String,
        signatureArray: ReadableArray,
        data: ReadableArray,
        promise: Promise
    ) {
        try {
            val keyPairEntry = keyStore[keyId]
            if (keyPairEntry == null) {
                promise.reject("key_not_found", "Key not found")
                return
            }

            val inputData = readableArrayToByteArray(data)
            val signatureBytes = readableArrayToByteArray(signatureArray)

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