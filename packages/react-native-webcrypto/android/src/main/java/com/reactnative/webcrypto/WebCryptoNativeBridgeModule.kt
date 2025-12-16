package com.reactnative.webcrypto

import android.util.Base64
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.security.MessageDigest
import java.security.SecureRandom
import java.util.UUID

class WebCryptoNativeBridgeModule(
    reactContext: ReactApplicationContext
): ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = NAME

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