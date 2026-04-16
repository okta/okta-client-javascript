package com.okta.webcryptobridge

import android.security.keystore.KeyGenParameterSpec
import org.json.JSONObject
import java.security.PublicKey

/**
 * Interface for algorithm-specific cryptographic operations.
 *
 * Implementations of this interface encapsulate all algorithm-specific logic for key generation,
 * import/export, and signing operations. This allows the main WebCryptoBridgeModule to remain
 * algorithm-agnostic and makes it easy to add support for new algorithms (EC, EdDSA) without
 * modifying the core module logic.
 */
interface CryptoAlgorithmHandler {
    /**
     * Generates a KeyGenParameterSpec for this algorithm.
     *
     * This spec is used to configure the Android KeyPairGenerator for key generation in the
     * Android Keystore. The handler is responsible for validating algorithm parameters and
     * throwing IllegalArgumentException if the parameters are invalid (e.g., unsupported key size).
     *
     * @param alias the keystore alias for the key being generated
     * @param params JSON object containing algorithm-specific parameters (e.g., `modulusLength` for RSA)
     * @param purposes bit flags indicating key usage (e.g., KeyProperties.PURPOSE_SIGN)
     * @return a configured KeyGenParameterSpec for this algorithm
     * @throws IllegalArgumentException if algorithm parameters are invalid
     */
    fun generateKeySpec(alias: String, params: JSONObject, purposes: Int): KeyGenParameterSpec

    /**
     * Exports a public key to JWK (JSON Web Key) format.
     *
     * Handles algorithm-specific JWK fields. For example:
     * - RSA exports the modulus (`n`) and public exponent (`e`)
     * - EC would export the curve point coordinates (`x`, `y`)
     *
     * @param publicKey the public key to export
     * @return a JSONObject containing the JWK representation (always includes `kty` and `alg`)
     */
    fun exportToJWK(publicKey: PublicKey): JSONObject

    /**
     * Imports a public key from JWK (JSON Web Key) format.
     *
     * Handles algorithm-specific key reconstruction from JWK fields. For example:
     * - RSA reconstructs the key from modulus (`n`) and public exponent (`e`)
     * - EC would reconstruct from curve point coordinates (`x`, `y`)
     *
     * @param jwk the JWK object containing algorithm-specific fields
     * @return the reconstructed PublicKey
     * @throws IllegalArgumentException if JWK is malformed or contains invalid values
     */
    fun importFromJWK(jwk: JSONObject): PublicKey

    /**
     * Returns the signature algorithm string for this algorithm.
     *
     * This string is passed to `Signature.getInstance()` to obtain the appropriate
     * signature provider. Examples:
     * - `"SHA256withRSA"` for RSA with SHA-256
     * - `"SHA256withECDSA"` for ECDSA with SHA-256
     *
     * @return the signature algorithm string (e.g., `"SHA256withRSA"`)
     */
    fun getSignatureAlgorithm(): String
}
