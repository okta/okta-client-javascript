import Security

/// Specification for key generation, returned by algorithm handlers.
struct KeyGenSpec {
    /// SecKeyAttribute key type (e.g., kSecAttrKeyTypeRSA)
    let keyType: CFString
    /// Key size in bits
    let keySize: Int
}

/// Protocol for algorithm-specific cryptographic operations.
/// Implementations handle key generation specs, JWK export/import, and signature algorithm selection
/// for specific algorithms (RSA, ECDSA, EdDSA, etc).
protocol CryptoAlgorithmHandler {
    /// Generates key generation specifications for this algorithm.
    /// Validates algorithm parameters and returns the specs needed for SecKeyCreateRandomKey.
    ///
    /// @param params Dictionary containing algorithm parameters (e.g., "modulusLength" for RSA)
    /// @return KeyGenSpec with keyType and keySize
    /// @throws NSError if parameters are invalid or unsupported for this algorithm
    func generateKeySpec(_ params: [String: Any]) throws -> KeyGenSpec

    /// Returns the SecKeyAlgorithm constant for this algorithm's signing/verification operations.
    /// @return SecKeyAlgorithm (e.g., .rsaSignatureMessagePKCS1v15SHA256 for RSA)
    func getSignatureAlgorithm() -> SecKeyAlgorithm

    /// Exports a public key to JWK (JSON Web Key) format.
    /// Handles algorithm-specific JWK fields (e.g., "n", "e" for RSA; "x", "y" for EC).
    ///
    /// @param publicKey The SecKey to export
    /// @param keyComponents RSAPublicKeyComponents containing modulus and exponent
    /// @return Dictionary with JWK representation including "kty", algorithm identifier, and key components
    func exportToJWK(publicKey: SecKey, keyComponents: RSAPublicKeyComponents) -> [String: Any]

    /// Imports a public key from JWK (JSON Web Key) format.
    /// Validates JWK structure and extracts algorithm-specific components.
    ///
    /// @param jwk Dictionary representation of a JWK
    /// @return RSAPublicKeyComponents if parsing succeeds, nil otherwise
    func importFromJWK(_ jwk: [String: Any]) -> RSAPublicKeyComponents?
}
