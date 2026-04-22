import Security
import Foundation

/// RSA algorithm handler implementing RSASSA-PKCS1-v1_5 with SHA-256.
class RSAHandler: CryptoAlgorithmHandler {
    /// Generates key specs for RSA key generation.
    /// Only supports 2048-bit RSA keys.
    ///
    /// @param params Dictionary with "modulusLength" key
    /// @return KeyGenSpec with RSA key type and size
    /// @throws NSError if modulusLength is not 2048
    func generateKeySpec(_ params: [String: Any]) throws -> KeyGenSpec {
        let modulusLength = (params["modulusLength"] as? NSNumber)?.intValue ?? 2048
        if modulusLength != 2048 {
            let error = NSError(
                domain: "RSAHandler",
                code: -1,
                userInfo: [NSLocalizedDescriptionKey: "RSA: only 2048-bit keys are supported"]
            )
            throw error
        }

        return KeyGenSpec(keyType: kSecAttrKeyTypeRSA, keySize: 2048)
    }

    /// Returns the signature algorithm for RSA: SHA256 with RSA PKCS#1 v1.5 padding.
    func getSignatureAlgorithm() -> SecKeyAlgorithm {
        return .rsaSignatureMessagePKCS1v15SHA256
    }

    /// Exports an RSA public key to JWK format.
    /// Creates a JWK dictionary with RSA-specific fields:
    /// - "kty": "RSA" (key type)
    /// - "alg": "RS256" (algorithm identifier)
    /// - "n": Base64URL-encoded modulus
    /// - "e": Base64URL-encoded public exponent
    ///
    /// @param publicKey The SecKey object (unused, components contain the key data)
    /// @param keyComponents RSAPublicKeyComponents with modulus and exponent
    /// @return Dictionary representation of RSA JWK
    func exportToJWK(publicKey: SecKey?, keyComponents: RSAPublicKeyComponents) -> [String: Any] {
        var jwk: [String: Any] = [:]
        jwk["kty"] = "RSA"
        jwk["alg"] = "RS256"
        jwk["n"] = keyComponents.modulus.base64URLEncodedString()
        jwk["e"] = keyComponents.exponent.base64URLEncodedString()
        return jwk
    }

    /// Imports an RSA public key from JWK format.
    /// Extracts and validates the "n" (modulus) and "e" (exponent) components.
    ///
    /// @param jwk Dictionary representation of RSA JWK
    /// @return RSAPublicKeyComponents if valid, nil if parsing fails
    func importFromJWK(_ jwk: [String: Any]) -> RSAPublicKeyComponents? {
        guard let nString = jwk["n"] as? String,
              let eString = jwk["e"] as? String,
              let modulusData = Data(base64Encoded: nString.base64URLDecoded),
              let exponentData = Data(base64Encoded: eString.base64URLDecoded) else {
            return nil
        }

        return RSAPublicKeyComponents(modulus: modulusData, exponent: exponentData)
    }
}
