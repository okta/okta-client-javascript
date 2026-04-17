package com.okta.webcryptobridge

import com.okta.webcryptobridge.algorithms.RSAHandler

/**
 * Registry for managing cryptographic algorithm handlers.
 *
 * This singleton registry maintains a mapping from algorithm names (like "RSASSA-PKCS1-v1_5")
 * to their corresponding CryptoAlgorithmHandler implementations. It provides lookup methods
 * for dispatching algorithm-specific operations in the WebCryptoBridgeModule.
 */
object CryptoAlgorithmRegistry {
    private val handlers = mutableMapOf<String, CryptoAlgorithmHandler>()

    init {
        // Register built-in handlers
        register("RSASSA-PKCS1-v1_5", RSAHandler())
        // Future: register("ECDSA", ECDSAHandler())
        // Future: register("EdDSA", EdDSAHandler())
    }

    /**
     * Registers a handler for an algorithm.
     *
     * This is typically called during registry initialization or when dynamically adding
     * support for new algorithms.
     *
     * @param algorithmName the algorithm identifier (e.g., "RSASSA-PKCS1-v1_5")
     * @param handler the handler to register for this algorithm
     */
    fun register(algorithmName: String, handler: CryptoAlgorithmHandler) {
        handlers[algorithmName] = handler
    }

    /**
     * Gets a handler by algorithm name.
     *
     * Used when the algorithm name is already known (e.g., from `algorithm.name` in generateKey).
     *
     * @param algorithmName the algorithm identifier (e.g., "RSASSA-PKCS1-v1_5")
     * @return the handler for this algorithm, or null if not found
     */
    fun getHandler(algorithmName: String): CryptoAlgorithmHandler? {
        return handlers[algorithmName]
    }

    /**
     * Gets a handler by JWK key type.
     *
     * Used when importing keys from JWK format; the key type (`kty`) is extracted from
     * the JWK and mapped to the corresponding algorithm handler.
     *
     * @param kty the JWK key type (e.g., "RSA", "EC", "OKP")
     * @return the handler for this key type, or null if not found
     */
    fun getHandlerByKeyType(kty: String): CryptoAlgorithmHandler? {
        return when (kty) {
            "RSA" -> handlers["RSASSA-PKCS1-v1_5"]
            "EC" -> handlers["ECDSA"]
            "OKP" -> handlers["EdDSA"]
            else -> null
        }
    }

    /**
     * Gets the algorithm name for a JWK key type.
     *
     * This is used when importing keys to determine which algorithm they use, so it can
     * be stored in the CryptoKey metadata for later use in sign/verify operations.
     *
     * @param kty the JWK key type (e.g., "RSA", "EC", "OKP")
     * @return the algorithm name for this key type, or null if not found
     */
    fun getAlgorithmNameByKeyType(kty: String): String? {
        return when (kty) {
            "RSA" -> "RSASSA-PKCS1-v1_5"
            "EC" -> "ECDSA"
            "OKP" -> "EdDSA"
            else -> null
        }
    }
}
