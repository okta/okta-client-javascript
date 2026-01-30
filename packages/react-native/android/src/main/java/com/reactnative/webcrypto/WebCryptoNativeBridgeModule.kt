package com.reactnative.webcrypto

import android.util.Base64
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.security.MessageDigest
import java.security.SecureRandom
import java.util.UUID

import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import java.security.KeyFactory
import java.security.KeyPairGenerator
import java.security.PrivateKey
import java.security.PublicKey
import java.security.Signature
import java.security.spec.ECGenParameterSpec
import java.security.spec.MGF1ParameterSpec
import java.security.spec.PSSParameterSpec
import java.security.spec.PKCS8EncodedKeySpec
import java.security.spec.X509EncodedKeySpec
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

class WebCryptoNativeBridgeModule(
    reactContext: ReactApplicationContext
): ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = NAME

    private fun getString(map: ReadableMap, key: String): String? {
        if(map.hasKey(key) && !map.isNull(key)){
            return map.getString(key)
        }  else {
            return null
        }
    }

    private fun getInt(map: ReadableMap, key: String, defaultValue: Int): Int {
        if(map.hasKey(key) && !map.isNull(key)){
            return map.getInt(key)
        }  else {
            return defaultValue
        }
    } 

    private fun readableArrayToStringList(arr: ReadableArray): List<String> {
        val list = mutableListOf<String>()

        for(i in 0 until arr.size()){
            list.add(arr.getString(i) ?: "")
        }
        return list
    }

    private fun base64ToBytes(b64: String): ByteArray {
        return Base64.decode(b64, Base64.DEFAULT)
    }

     private fun bytesToBase64(bytes: ByteArray): String {
        return Base64.encodeToString(bytes, Base64.NO_WRAP)
    }

    private fun algoHashToJava(hashName: String): String = when(hashName.uppercase()) { 
            "SHA-1" -> "SHA-1"
            "SHA-256" -> "SHA-256"
            "SHA-384" -> "SHA-384"
            "SHA-512" -> "SHA-512"
            else -> throw IllegalArgumentException("Unsupported hash: $hashName")
    }

    private fun algoHashToHmac(hashName: String): String = when(hashName.uppercase()) { 
            "SHA-256" -> "HmacSHA256"
            "SHA-384" -> "HmacSHA384"
            "SHA-512" -> "HmacSHA512"
            else -> throw IllegalArgumentException("Unsupported HMAC: $hashName")
    }

    private fun curvetoEcSpec(namedCurve: String): String = when(namedCurve) {
            "P-256" -> "secp256r1"
            "P-384" -> "secp384r1"
            "P-521" -> "secp521r1"
            else -> throw IllegalArgumentException("Unsupported namedCurve: $namedCurve")
    }

    private fun makeKeyMap(
        type: String,
        algorithm: ReadableMap,
        extractable: Boolean,
        usages: ReadableArray,
        format: String,
        data: String
    ): WritableMap {
        val m = Arguments.createMap()
        m.putString("type", type)
        m.putMap("algorithm", Arguments.makeNativeMap(algorithm.toHashMap()))
        m.putBoolean("extractable", extractable)
        m.putArray("usages", Arguments.fromList(readableArrayToStringList(usages)))
        m.putString("format", format)
        m.putString("data", data)
        return m
    }

    @ReactMethod
    fun generateKey(
        algorithm: ReadableMap,
        extractable: Boolean,
        keyUsages: ReadableArray,
        promise: Promise
    ){
        try {
            val name = getString(algorithm, "name")?.uppercase() ?: throw IllegalArgumentException("Algorithm name is required")

            when(name){
                "HMAC" -> {
                    val hashMap = algorithm.getMap("hash") ?: throw IllegalArgumentException("HMAC requires algorithm.hash")
                    val hashName = getString(hashMap, "name") ?: throw IllegalArgumentException("HMAC requires algorithm.hash.name")

                    val lenthBits = getInt(algorithm, "length", 256)
                    if(lenthBits <=0 || lenthBits %8 !=0){
                        throw IllegalArgumentException("HMAC length must be a positive multiple of 8")
                    }

                    val keyBytes = ByteArray(lenthBits / 8)
                    val secureRandom = SecureRandom()
                    secureRandom.nextBytes(keyBytes)

                    val key = makeKeyMap(
                        type = "secret", 
                        algorithm = algorithm, 
                        extractable = extractable, 
                        usages = keyUsages, 
                        format = "raw", 
                        bytesToBase64(keyBytes))

                    promise.resolve(key)
                }
                "ECDSA" -> {
                    val namedCurve = getString(algorithm, "namedCurve") ?: throw IllegalArgumentException("ECDSA requires algorithm.namedCurve")
                    val ecSpecName = curvetoEcSpec(namedCurve)

                    val kpg = KeyPairGenerator.getInstance("EC")
                    val ecSpec = ECGenParameterSpec(ecSpecName)
                    kpg.initialize(ecSpec)
                    
                    val keyPair = kpg.generateKeyPair()

                    val publicSpki = bytesToBase64(keyPair.public.encoded)
                    val privatePkcs8 = bytesToBase64(keyPair.private.encoded)

                    val publicKey = makeKeyMap(
                        type = "public", 
                        algorithm = algorithm, 
                        extractable = extractable, 
                        usages = keyUsages, 
                        format = "spki", 
                        data = publicSpki
                    )
                    val privateKey = makeKeyMap(
                        type = "private", 
                        algorithm = algorithm, 
                        extractable = extractable, 
                        usages = keyUsages, 
                        format = "pkcs8", 
                        data = privatePkcs8
                    )
                    val result = Arguments.createMap()
                    result.putMap("publicKey", publicKey)
                    result.putMap("privateKey", privateKey)

                    promise.resolve(result)
                }
                "RSA-PSS", "RSASSA-PKCS1-v1_5" -> {
                    val modulusLength = getInt(algorithm, "modulusLength", 2048)
                    val publicExponentB64 = getString(algorithm, "publicExponent") ?: throw IllegalArgumentException("RSA requires algorithm.publicExponent")
                    
                    val publicExponentBytes = base64ToBytes(publicExponentB64)
                    var eval = 0
                    for (byte in publicExponentBytes) {
                        eval = (eval shl 8) or (byte.toInt() and 0xFF)
                    }
                    if(eval <=1){
                        throw IllegalArgumentException("Invalid publicExponent")
                    }

                    val kpg = KeyPairGenerator.getInstance("RSA")
                    kpg.initialize(modulusLength)
                    
                    val keyPair = kpg.generateKeyPair()

                    val publicSpki = bytesToBase64(keyPair.public.encoded)
                    val privatePkcs8 = bytesToBase64(keyPair.private.encoded)

                    val publicKey = makeKeyMap(
                        type = "public", 
                        algorithm = algorithm, 
                        extractable = extractable, 
                        usages = keyUsages, 
                        format = "spki", 
                        data = publicSpki
                    )
                    val privateKey = makeKeyMap(
                        type = "private", 
                        algorithm = algorithm, 
                        extractable = extractable, 
                        usages = keyUsages, 
                        format = "pkcs8", 
                        data = privatePkcs8
                    )
                    val result = Arguments.createMap()
                    result.putMap("publicKey", publicKey)
                    result.putMap("privateKey", privateKey)

                    promise.resolve(result)
                }               
                else -> {
                    throw IllegalArgumentException("Unsupported generatedKey algorithm.name: $name")
                }
            }

        } catch(e: Exception){
            promise.reject("WebCryptoNativeBridgeModule.generateKey", e) 
        }
    }

    @ReactMethod
    fun importKey(
        format: String,
        keyData: String,
        algorithm: ReadableMap,
        extractable: Boolean,
        keyUsages: ReadableArray,
        promise: Promise
    ){
        try {
            val name = getString(algorithm, "name")?.uppercase() ?: throw IllegalArgumentException("Algorithm name is required")
            val fmt = format.lowercase()

            when(name){
                "HMAC" -> {
                    if(fmt != "raw"){
                        throw IllegalArgumentException("HMAC import supports only formt = raw (base64)")
                    }
                    
                    val raw = base64ToBytes(keyData)

                    val key = makeKeyMap(
                        type = "secret",
                        algorithm = algorithm,
                        extractable = extractable,
                        usages = keyUsages,
                        format = "raw",
                        data = keyData
                    )
                    promise.resolve(key)
                } 
                "ECDSA" -> {

                } 
                "RSA-PSS", "RSASSA-PKCS1-v1_5" -> {
                    // For simplicity, we are not validating the key data here.
                    val key = makeKeyMap(
                        type = when(format){
                            "raw" -> "secret"
                            "spki" -> "public"
                            "pkcs8" -> "private"
                            else -> throw IllegalArgumentException("Unsupported key format: $format")
                        },
                        algorithm = algorithm,
                        extractable = extractable,
                        usages = keyUsages,
                        format = format,
                        data = keyData
                    )
                    promise.resolve(key)
                }
                else -> {
                    throw IllegalArgumentException("Unsupported importKey algorithm.name: $name")
                }
            }

        } catch(e: Exception){
            promise.reject("WebCryptoNativeBridgeModule.importKey", e) 
        }
    }

    @ReactMethod
    fun sign(
        algorithm: ReadableMap,
        key: ReadableMap,
        dataBase64: String,
        promise: Promise
    ){
        try {
            val name = (getString(algorithm, "name") ?:"").uppercase()
            val data = base64ToBytes(dataBase64)

            val keyType = getString(key, "type") ?: throw IllegalArgumentException("Key missing type")
            val keyFormat = (getString(key, "format") ?: "").lowercase()
            val keyData = getString(key, "data") ?: throw IllegalArgumentException("Key missing data")
       
            when(name){
                "HMAC" -> {
                    if(keyType != "secret" || keyFormat != "raw"){
                        throw IllegalArgumentException("HMAC sign requires secret raw key")
                    }

                    val hashMap = algorithm.getMap("hash") ?: throw IllegalArgumentException("HMAC requires algorithm.hash")
                    val hashName = getString(hashMap, "name") ?: throw IllegalArgumentException("HMAC requires algorithm.hash.name")

                    val macAlgo = algoHashToHmac(hashName)
                    val rawKey = base64ToBytes(keyData)

                    val secretKey = SecretKeySpec(rawKey, macAlgo)

                    val mac = Mac.getInstance(macAlgo)
                    mac.init(secretKey)
                    val signature = mac.doFinal(data)

                    val signatureB64 = bytesToBase64(signature)
                    promise.resolve(signatureB64)
                }
                "ECDSA" -> {
                    if(keyType != "private" || keyFormat != "pkcs8"){
                        throw IllegalArgumentException("ECDSA sign requires private pkcs8 key")
                    }

                    val hashMap = algorithm.getMap("hash") ?: throw IllegalArgumentException("ECDSA requires algorithm.hash")
                    val hashName = getString(hashMap, "name") ?: throw IllegalArgumentException("ECDSA requires algorithm.hash.name")

                    val sigAlgo = when(hashName.uppercase()){
                        "SHA-256" -> "SHA256withECDSA"
                        "SHA-384" -> "SHA384withECDSA"
                        "SHA-512" -> "SHA512withECDSA"
                        else -> throw IllegalArgumentException("Unsupported ECDSA hash: $hashName")
                    }

                    val keyBytes = base64ToBytes(keyData)
                    val keySpec = PKCS8EncodedKeySpec(keyBytes)

                    val keyFactory = KeyFactory.getInstance("EC")
                    val privateKey = keyFactory.generatePrivate(keySpec)

                    val signatureInstance = Signature.getInstance(sigAlgo)
                    signatureInstance.initSign(privateKey)
                    signatureInstance.update(data)
                    val signature = signatureInstance.sign()

                    val signatureB64 = bytesToBase64(signature)
                    promise.resolve(signatureB64)
                }

                "RSA-PSS"-> {
                    if(keyType != "private" || keyFormat != "pkcs8"){
                        throw IllegalArgumentException("$name sign requires private pkcs8 key")
                    }

                    val hashMap = algorithm.getMap("hash") ?: throw IllegalArgumentException("$name requires algorithm.hash")
                    val hashName = getString(hashMap, "name") ?: throw IllegalArgumentException("$name requires algorithm.hash.name")

                    val saltLength = getInt(algorithm, "saltLength", 32)

                    val keyBytes = base64ToBytes(keyData)
                    val keySpec = PKCS8EncodedKeySpec(keyBytes)

                    val keyFactory = KeyFactory.getInstance("RSA")
                    val privateKey = keyFactory.generatePrivate(keySpec)

                    val signatureInstance = Signature.getInstance("RSASSA-PSS")
                    val digest = algoHashToJava(hashName)
                    signatureInstance.setParameter(
                        PSSParameterSpec(
                            digest,
                            "MGF1",
                            MGF1ParameterSpec(digest),
                            saltLength,
                            1
                        )
                    )


                    signatureInstance.initSign(privateKey)
                    signatureInstance.update(data)
                    val signature = signatureInstance.sign()

                    val signatureB64 = bytesToBase64(signature)
                    promise.resolve(signatureB64)
                }

                "RSASSA-PKCS1-v1_5"-> {
                    if(keyType != "private" || keyFormat != "pkcs8"){
                        throw IllegalArgumentException("$name sign requires private pkcs8 key")
                    }

                    val hashMap = algorithm.getMap("hash") ?: throw IllegalArgumentException("$name requires algorithm.hash")
                    val hashName = getString(hashMap, "name") ?: throw IllegalArgumentException("$name requires algorithm.hash.name")

                    val keyBytes = base64ToBytes(keyData)
                    val keySpec = PKCS8EncodedKeySpec(keyBytes)

                    val keyFactory = KeyFactory.getInstance("RSA")
                    val privateKey = keyFactory.generatePrivate(keySpec)

                    val sigAlgo = when(hashName.uppercase()){
                        "SHA-1" -> "SHA1withRSA"
                        "SHA-256" -> "SHA256withRSA"
                        "SHA-384" -> "SHA384withRSA"
                        "SHA-512" -> "SHA512withRSA"
                        else -> throw IllegalArgumentException("Unsupported RSA hash: $hashName")
                    }

                    val signatureInstance = Signature.getInstance(sigAlgo)
                    signatureInstance.initSign(privateKey)
                    signatureInstance.update(data)
                    val signature = signatureInstance.sign()

                    val signatureB64 = bytesToBase64(signature)
                    promise.resolve(signatureB64)
                }
                else -> {
                    throw IllegalArgumentException("Unsupported sign algorithm.name: $name")
                }
            }
        } catch(e: Exception){
            promise.reject("WebCryptoNativeBridgeModule.sign", e) 
        }


    }

    @ReactMethod
    fun digest(
        algorithm: String,
        dataBase64: String,
        promise: Promise
    ){
        try{    
            
            val algo = when(algorithm.uppercase()){
                "SHA-1" -> "SHA-1"
                "SHA-256" -> "SHA-256"
                "SHA-384" -> "SHA-384"
                "SHA-512" -> "SHA-512"
                else -> throw IllegalArgumentException("Unsupported algorithm: $algorithm")
            }

            val data = Base64.decode(dataBase64, Base64.DEFAULT)
            val messageDigest = MessageDigest.getInstance(algo)
            val digest = messageDigest.digest(data)
            val result = Base64.encodeToString(digest, Base64.NO_WRAP)
            promise.resolve(result)

        } catch(e: Exception){
            promise.reject("WebCryptoNativeBridgeModule.digest", e) 
            
        }
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun getRandomValues(
        length: Double,
    ): String{
        try {
            val n = length.toInt();
            if(n<=0 || n > 65536){
                throw IllegalArgumentException("Length must be between 1 and 65536")
            }

            val randomBytes = ByteArray(n)
            val secureRandom = SecureRandom()
            secureRandom.nextBytes(randomBytes)

            val result = Base64.encodeToString(randomBytes, Base64.NO_WRAP)

            return result
        } catch(e: Exception){
            throw Error("WebCryptoNativeBridgeModule.getRandomValues", e) 
        }
        
    }

    @ReactMethod
    fun randomUUID(promise: Promise){
        try {
            val uuid = UUID.randomUUID().toString()
            promise.resolve(uuid)
        } catch(e: Exception){
            promise.reject("WebCryptoNativeBridgeModule.randomUUID", e) 
        }
        
    }

    companion object {
        const val NAME = "WebCryptoNativeBridge"
    }
}