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

            val keyPairEntry = keyStore[keyId]
            if (keyPairEntry == null) {
                promise.reject("key_not_found", "Key not found")
                return
            }

            val key = if (keyType == "public") keyPair.public else keyPair.private
            val rsaPublicKey = key as? java.security.interfaces.RSAPublicKey

            if (rsaPublicKey == null) {
                promise.reject("export_failed", "Key is not an RSA public key")
                return
            }

            // Extract modulus and exponent
            val modulus = rsaPublicKey.modulus.toByteArray()
            val exponent = rsaPublicKey.publicExponent.toByteArray()

            // Remove leading zero bytes if present (BigInteger adds these for sign)
            val modulusClean = if (modulus[0].toInt() == 0) modulus.copyOfRange(1, modulus.size) else modulus
            val exponentClean = if (exponent[0].toInt() == 0) exponent.copyOfRange(1, exponent.size) else exponent

            val jwk = JSONObject()
            jwk.put("kty", "RSA")
            jwk.put("alg", "RS256")
            jwk.put("n", base64URLEncode(modulusClean))
            jwk.put("e", base64URLEncode(exponentClean))

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

            // Build ASN.1 DER encoded RSA public key
            val publicKeyData = constructRSAPublicKeyData(modulusBytes, exponentBytes)

            // Import the key
            val keyFactory = KeyFactory.getInstance("RSA")
            val keySpec = X509EncodedKeySpec(publicKeyData)
            val publicKey = keyFactory.generatePublic(keySpec)

            val keyId = UUID.randomUUID().toString()
            // Store as KeyPair with null private key
            keyStore[keyId] = KeyPair(publicKey, null)

            promise.resolve(keyId)
        } catch (e: Exception) {
            promise.reject("import_failed", e.message, e)
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

  // MARK: - ASN.1 Encoding Helpers

  private fun constructRSAPublicKeyData(modulus: ByteArray, exponent: ByteArray): ByteArray {
      // Build X.509 SubjectPublicKeyInfo structure
      // This matches the Swift implementation

      var modulusBytes = modulus
      val exponentBytes = exponent

      // Ensure modulus starts with 0x00 if MSB is set
      if (modulusBytes[0].toInt() and 0x80 != 0) {
          modulusBytes = byteArrayOf(0x00) + modulusBytes
      }

      // Build inner SEQUENCE: SEQUENCE { INTEGER modulus, INTEGER exponent }
      val innerSequence = encodeASN1Integer(modulusBytes) + encodeASN1Integer(exponentBytes)
      val innerSequenceEncoded = encodeASN1Sequence(innerSequence)

      // Wrap in BIT STRING
      val bitString = byteArrayOf(0x00) + innerSequenceEncoded
      val bitStringEncoded = encodeASN1BitString(bitString)

      // Algorithm identifier: SEQUENCE { OID rsaEncryption, NULL }
      val rsaOID = byteArrayOf(
          0x06, 0x09, 0x2a.toByte(), 0x86.toByte(), 0x48, 0x86.toByte(),
          0xf7.toByte(), 0x0d, 0x01, 0x01, 0x01
      )
      val nullTag = byteArrayOf(0x05, 0x00)
      val algorithmIdentifier = encodeASN1Sequence(rsaOID + nullTag)

      // Build outer SEQUENCE
      val outerSequence = algorithmIdentifier + bitStringEncoded
      return encodeASN1Sequence(outerSequence)
  }

  private fun encodeASN1Integer(data: ByteArray): ByteArray {
      var intData = data

      // Remove leading zeros (but keep one if needed for sign)
      while (intData.size > 1 && intData[0].toInt() == 0 && intData[1].toInt() and 0x80 == 0) {
          intData = intData.copyOfRange(1, intData.size)
      }

      // Add leading zero if high bit is set
      if (intData[0].toInt() and 0x80 != 0) {
          intData = byteArrayOf(0x00) + intData
      }

      return byteArrayOf(0x02) + encodeLength(intData.size) + intData
  }

  private fun encodeASN1Sequence(data: ByteArray): ByteArray {
      return byteArrayOf(0x30) + encodeLength(data.size) + data
  }

  private fun encodeASN1BitString(data: ByteArray): ByteArray {
      return byteArrayOf(0x03) + encodeLength(data.size) + data
  }

  private fun encodeLength(length: Int): ByteArray {
      return if (length < 128) {
          byteArrayOf(length.toByte())
      } else {
          val lengthBytes = mutableListOf<Byte>()
          var len = length
          while (len > 0) {
              lengthBytes.add(0, (len and 0xFF).toByte())
              len = len shr 8
          }
          byteArrayOf((0x80 or lengthBytes.size).toByte()) + lengthBytes.toByteArray()
      }
  }
}