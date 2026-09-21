package com.okta.webcryptobridge.algorithms

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import com.okta.webcryptobridge.CryptoAlgorithmHandler
import com.okta.webcryptobridge.CryptoUtils
import com.okta.webcryptobridge.KeyGenSpec
import org.json.JSONObject
import java.math.BigInteger
import java.security.PublicKey
import java.security.KeyFactory
import java.security.interfaces.RSAPublicKey
import java.security.spec.RSAPublicKeySpec

/**
 * RSA algorithm handler implementing the CryptoAlgorithmHandler interface.
 *
 * This handler encapsulates all RSA-specific logic for key generation, import/export, and
 * signature algorithm selection. It validates RSA parameters (currently supporting only 2048-bit keys)
 * and provides JWK import/export for RSA public keys.
 */
class RSAHandler : CryptoAlgorithmHandler {
    /**
     * Generates a KeyGenParameterSpec for RSA.
     *
     * Validates that the modulus length is exactly 2048 bits (as per current requirements).
     * Configures the key for SHA256 digests and PKCS#1 v1.5 padding.
     *
     * @param alias the keystore alias for the key
     * @param params JSON object with required field: `modulusLength` (must be 2048)
     * @param purposes bit flags indicating key usage
     * @return configured KeyGenParameterSpec for RSA
     * @throws IllegalArgumentException if modulusLength is not 2048
     */
    override fun generateKeySpec(
        alias: String,
        params: JSONObject,
        purposes: Int
    ): KeyGenSpec {
        val modulusLength = params.getInt("modulusLength")
        if (modulusLength != 2048) {
            throw IllegalArgumentException("RSA: only 2048-bit keys are supported")
        }

        val keyGenParameterSpec = KeyGenParameterSpec.Builder(alias, purposes)
            .setKeySize(2048)
            .setDigests(KeyProperties.DIGEST_SHA256)
            .setSignaturePaddings(KeyProperties.SIGNATURE_PADDING_RSA_PKCS1)
            .build()

        return KeyGenSpec(
            keyGenParameterSpec = keyGenParameterSpec,
            keyAlgorithm = KeyProperties.KEY_ALGORITHM_RSA
        )
    }

    /**
     * Exports an RSA public key to JWK format.
     *
     * Extracts the modulus and public exponent from the RSA public key and encodes them
     * as Base64URL strings per RFC 7517 (JSON Web Key).
     *
     * @param publicKey the RSA public key to export
     * @return JSONObject with fields: `kty` ("RSA"), `alg` ("RS256"), `n` (modulus), `e` (exponent)
     */
    override fun exportToJWK(publicKey: PublicKey): JSONObject {
        val rsaPublicKey = publicKey as RSAPublicKey
        val jwk = JSONObject()
        jwk.put("kty", "RSA")
        jwk.put("alg", "RS256")
        jwk.put("n", CryptoUtils.base64URLEncode(CryptoUtils.toUnsignedByteArray(rsaPublicKey.modulus)))
        jwk.put("e", CryptoUtils.base64URLEncode(CryptoUtils.toUnsignedByteArray(rsaPublicKey.publicExponent)))
        return jwk
    }

    /**
     * Imports an RSA public key from JWK format.
     *
     * Reconstructs an RSA public key from modulus (`n`) and exponent (`e`) fields encoded
     * as Base64URL strings per RFC 7517.
     *
     * @param jwk JSONObject containing fields: `n` (modulus), `e` (exponent)
     * @return reconstructed RSA PublicKey
     * @throws IllegalArgumentException if `n` or `e` fields are missing or invalid
     */
    override fun importFromJWK(jwk: JSONObject): PublicKey {
        val nString = jwk.getString("n")
        val eString = jwk.getString("e")

        val modulusBytes = CryptoUtils.base64URLDecode(nString)
        val exponentBytes = CryptoUtils.base64URLDecode(eString)

        val modulus = BigInteger(1, modulusBytes)
        val exponent = BigInteger(1, exponentBytes)

        val keyFactory = KeyFactory.getInstance("RSA")
        val keySpec = RSAPublicKeySpec(modulus, exponent)
        return keyFactory.generatePublic(keySpec)
    }

    /**
     * Returns the signature algorithm string for RSA.
     *
     * @return `"SHA256withRSA"` for signing with RSASSA-PKCS1-v1_5 and SHA-256
     */
    override fun getSignatureAlgorithm(): String = "SHA256withRSA"
}
