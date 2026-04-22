import Foundation
import Security
import CommonCrypto
import React


extension String {
    public var base64URLDecoded: String { convertToBase64URLDecoded() }

    private func convertToBase64URLDecoded() -> String {
        var result = replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")

        while result.count % 4 != 0 {
            result.append(contentsOf: "=")
        }

        return result
    }
}

extension Data {
    public func base64URLEncodedString() -> String {
        var base64 = self.base64EncodedString()
        base64 = base64.replacingOccurrences(of: "+", with: "-")
        base64 = base64.replacingOccurrences(of: "/", with: "_")
        base64 = base64.replacingOccurrences(of: "=", with: "")
        return base64
    }
}

// MARK: - Key Storage Models

/// Enum representing where and how a cryptographic key is stored.
/// Differentiates between generated keys and imported public keys.
enum CryptoKeyEntry {
    /// Key stored in Secure Enclave (generated, non-extractable)
    case keystore(publicKey: SecKey, privateKey: SecKey?)

    /// Key stored in memory (imported from JWK, extractable)
    case platform(key: SecKey, algorithmName: String)
}

/// Type-safe representation of a cryptographic key metadata.
/// Encapsulates key information following the WebCrypto API model.
struct CryptoKey {
    /// The key algorithm (e.g., {"name": "RSASSA-PKCS1-v1_5", "modulusLength": 2048})
    let algorithm: [String: Any]

    /// Key type: "private", "public", or "secret"
    let type: String

    /// Whether the key can be exported
    let extractable: Bool

    /// Permitted operations: "sign", "verify", "encrypt", "decrypt", etc.
    let usages: [String]

    /// Storage location and access method for the key
    let entry: CryptoKeyEntry
}

// MARK: - WebCryptoBridge

@objc(WebCryptoBridge)
class WebCryptoBridge: NSObject {

    // Key storage — maps keyId to CryptoKey with full metadata
    private static var keyStore: [String: CryptoKey] = [:]
    private static let keyStoreLock = NSLock()

    @objc
    static func requiresMainQueueSetup() -> Bool {
        return false
    }

    @objc
    static func moduleName() -> String! {
        return "WebCryptoBridge"
    }

    @objc
    func constantsToExport() -> [AnyHashable: Any]! {
        return [:]
    }

    // MARK: - Helper Methods

    /// Decode a standard Base64 string to Data.
    private func base64ToData(_ base64: String) -> Data? {
        return Data(base64Encoded: base64)
    }

    /// Encode Data to a standard Base64 string.
    private func dataToBase64(_ data: Data) -> String {
        return data.base64EncodedString()
    }

    // MARK: - Synchronous Methods

    @objc(getRandomValues:)
    func getRandomValues(_ length: Double) -> String {
        let len = Int(length)
        var randomData = Data(count: len)

        let result = randomData.withUnsafeMutableBytes { bytes -> Int32 in
            guard let baseAddress = bytes.baseAddress else {
                return errSecParam
            }
            return SecRandomCopyBytes(kSecRandomDefault, len, baseAddress)
        }

        if result != errSecSuccess {
            // SecRandomCopyBytes failure indicates a fundamentally broken system RNG.
            // Returning empty/zero data would silently produce weak randomness, which
            // is a critical security failure. Crash explicitly rather than risk it.
            fatalError("WebCryptoBridge: SecRandomCopyBytes failed with status \(result). The system CSPRNG is unavailable.")
        }

        return dataToBase64(randomData)
    }

    @objc
    func randomUUID() -> String {
        return UUID().uuidString.lowercased()
    }

    // MARK: - Async Methods

    @objc(digest:data:resolve:reject:)
    func digest(
        _ algorithm: String,
        data: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        guard algorithm == "SHA-256" else {
            reject("unsupported_algorithm", "Only SHA-256 is supported", nil)
            return
        }

        guard let inputData = base64ToData(data) else {
            reject("invalid_input", "Invalid Base64 input data", nil)
            return
        }

        var hash = [UInt8](repeating: 0, count: Int(CC_SHA256_DIGEST_LENGTH))
        inputData.withUnsafeBytes { bytes in
            _ = CC_SHA256(bytes.baseAddress, CC_LONG(inputData.count), &hash)
        }

        let hashData = Data(hash)
        resolve(dataToBase64(hashData))
    }

    @objc(generateKey:extractable:keyUsages:resolve:reject:)
    func generateKey(
        _ algorithmJson: String,
        extractable: Bool,
        keyUsages: [String],
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        guard let algorithmData = algorithmJson.data(using: .utf8),
              let algorithm = try? JSONSerialization.jsonObject(with: algorithmData) as? [String: Any],
              let algorithmName = algorithm["name"] as? String else {
            reject("invalid_algorithm", "Invalid algorithm JSON", nil)
            return
        }

        guard let handler = AlgorithmRegistry.shared.getHandler(for: algorithmName) else {
            reject("unsupported_algorithm", "Algorithm not supported: \(algorithmName)", nil)
            return
        }

        // Handler generates the key specs for this algorithm
        let keyGenSpec: KeyGenSpec
        do {
            keyGenSpec = try handler.generateKeySpec(algorithm)
        } catch let error as NSError {
            reject("invalid_key_parameters", error.localizedDescription, error)
            return
        }

        let attributes: [String: Any] = [
            kSecAttrKeyType as String: keyGenSpec.keyType,
            kSecAttrKeySizeInBits as String: keyGenSpec.keySize,
            kSecPrivateKeyAttrs as String: [
                kSecAttrIsPermanent as String: false
            ],
            kSecPublicKeyAttrs as String: [
                kSecAttrIsPermanent as String: false
            ]
        ]

        var error: Unmanaged<CFError>?
        guard let privateKey = SecKeyCreateRandomKey(attributes as CFDictionary, &error) else {
            let err = error?.takeRetainedValue()
            reject("key_generation_failed", err?.localizedDescription ?? "Unknown error", err)
            return
        }

        guard let publicKey = SecKeyCopyPublicKey(privateKey) else {
            reject("key_generation_failed", "Failed to get public key", nil)
            return
        }

        let keyId = UUID().uuidString

        Self.keyStoreLock.lock()
        Self.keyStore[keyId] = CryptoKey(
            algorithm: algorithm,
            type: "private",
            extractable: extractable,
            usages: keyUsages,
            entry: .keystore(publicKey: publicKey, privateKey: privateKey)
        )
        Self.keyStoreLock.unlock()

        let result = ["id": keyId]
        if let jsonData = try? JSONSerialization.data(withJSONObject: result),
           let jsonString = String(data: jsonData, encoding: .utf8) {
            resolve(jsonString)
        } else {
            reject("serialization_failed", "Failed to serialize result", nil)
        }
    }

    @objc(exportKey:keyId:resolve:reject:)
    func exportKey(
        _ format: String,
        keyId: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        guard format == "jwk" else {
            reject("unsupported_format", "Only JWK format is supported", nil)
            return
        }

        Self.keyStoreLock.lock()
        let cryptoKey = Self.keyStore[keyId]
        Self.keyStoreLock.unlock()

        guard let cryptoKey = cryptoKey else {
            reject("key_not_found", "Key not found", nil)
            return
        }

        let key: SecKey
        switch cryptoKey.entry {
        case .keystore(let publicKey, let privateKey):
            if cryptoKey.type == "public" {
                key = publicKey
            } else {
                guard let pk = privateKey else {
                    reject("key_not_found", "Private key not available for this key", nil)
                    return
                }
                key = pk
            }
        case .platform(let platformKey, _):
            key = platformKey
        }

        var error: Unmanaged<CFError>?
        guard let keyData = SecKeyCopyExternalRepresentation(key, &error) as Data? else {
            let err = error?.takeRetainedValue()
            reject("export_failed", err?.localizedDescription ?? "Export failed", err)
            return
        }

        // For RSA, SecKeyCopyExternalRepresentation returns PKCS#1 RSAPublicKey:
        // SEQUENCE { INTEGER modulus, INTEGER exponent }
        guard let components = RSAPublicKeyComponents(derData: keyData) else {
            reject("export_failed", "Failed to parse RSA public key components", nil)
            return
        }

        // Use handler to build JWK
        let handler = RSAHandler()
        let jwk = handler.exportToJWK(publicKey: key, keyComponents: components)

        if let jsonData = try? JSONSerialization.data(withJSONObject: jwk),
           let jsonString = String(data: jsonData, encoding: .utf8) {
            resolve(jsonString)
        } else {
            reject("serialization_failed", "Failed to serialize JWK", nil)
        }
    }

    @objc(importKey:keyData:algorithm:extractable:keyUsages:resolve:reject:)
    func importKey(
        _ format: String,
        keyData: String,
        algorithm: String,
        extractable: Bool,
        keyUsages: [String],
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        guard format == "jwk" else {
            reject("unsupported_format", "Only JWK format is supported", nil)
            return
        }

        guard let jwkData = keyData.data(using: .utf8),
              let jwk = try? JSONSerialization.jsonObject(with: jwkData) as? [String: Any],
              let kty = jwk["kty"] as? String else {
            reject("invalid_jwk", "Invalid JWK format", nil)
            return
        }

        // Use handler to import from JWK
        guard let handler = AlgorithmRegistry.shared.getHandlerByKeyType(kty) else {
            reject("unsupported_key_type", "Key type not supported: \(kty)", nil)
            return
        }

        guard let components = handler.importFromJWK(jwk) else {
            reject("invalid_jwk", "Invalid JWK components", nil)
            return
        }

        let keyId = UUID().uuidString
        let publicKeyData = components.derData

        // Key size is derived from the modulus
        let keySizeInBits = components.keySizeInBits

        var error: Unmanaged<CFError>?
        let attributes: [CFString: Any] = [
            kSecAttrKeyType: kSecAttrKeyTypeRSA,
            kSecAttrKeyClass: kSecAttrKeyClassPublic,
            kSecAttrKeySizeInBits: NSNumber(value: keySizeInBits)
        ]

        guard let publicKey = SecKeyCreateWithData(publicKeyData as NSData, attributes as NSDictionary, &error) else {
            let err = error?.takeRetainedValue()
            reject("import_failed", err?.localizedDescription ?? "Import failed", err)
            return
        }

        Self.keyStoreLock.lock()
        let algorithmDict = (try? JSONSerialization.jsonObject(with: algorithm.data(using: .utf8)!) as? [String: Any]) ?? [:]
        Self.keyStore[keyId] = CryptoKey(
            algorithm: algorithmDict,
            type: "public",
            extractable: extractable,
            usages: keyUsages,
            entry: .platform(key: publicKey, algorithmName: keyTypeToAlgorithmName(kty))
        )
        Self.keyStoreLock.unlock()

        resolve(keyId)
    }

    /// Maps JWK key type to algorithm name.
    private func keyTypeToAlgorithmName(_ kty: String) -> String {
        switch kty {
        case "RSA": return "RSASSA-PKCS1-v1_5"
        case "EC": return "ECDSA"
        case "OKP": return "EdDSA"
        default: return "unknown"
        }
    }

    @objc(sign:keyId:data:resolve:reject:)
    func sign(
        _ algorithmJson: String,
        keyId: String,
        data: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        Self.keyStoreLock.lock()
        let cryptoKey = Self.keyStore[keyId]
        Self.keyStoreLock.unlock()

        guard let cryptoKey = cryptoKey else {
            reject("key_not_found", "Key not found", nil)
            return
        }

        guard case .keystore(_, let privateKey) = cryptoKey.entry,
              let pk = privateKey else {
            reject("key_not_found", "Private key not available for this key", nil)
            return
        }

        guard let inputData = base64ToData(data) else {
            reject("invalid_input", "Invalid Base64 input data", nil)
            return
        }

        // Use handler to get signature algorithm
        let handler = RSAHandler()
        let signatureAlgorithm = handler.getSignatureAlgorithm()

        var error: Unmanaged<CFError>?
        guard let signature = SecKeyCreateSignature(
            pk,
            signatureAlgorithm,
            inputData as CFData,
            &error
        ) as Data? else {
            let err = error?.takeRetainedValue()
            reject("signing_failed", err?.localizedDescription ?? "Signing failed", err)
            return
        }

        resolve(dataToBase64(signature))
    }

    @objc(verify:keyId:signature:data:resolve:reject:)
    func verify(
        _ algorithmJson: String,
        keyId: String,
        signature: String,
        data: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        Self.keyStoreLock.lock()
        let cryptoKey = Self.keyStore[keyId]
        Self.keyStoreLock.unlock()

        guard let cryptoKey = cryptoKey else {
            reject("key_not_found", "Public key not found", nil)
            return
        }

        guard let inputData = base64ToData(data) else {
            reject("invalid_input", "Invalid Base64 input data", nil)
            return
        }

        guard let signatureData = base64ToData(signature) else {
            reject("invalid_input", "Invalid Base64 signature data", nil)
            return
        }

        let publicKey: SecKey
        switch cryptoKey.entry {
        case .keystore(let pubKey, _):
            publicKey = pubKey
        case .platform(let key, _):
            publicKey = key
        }

        // Use handler to get signature algorithm
        let handler = RSAHandler()
        let signatureAlgorithm = handler.getSignatureAlgorithm()

        var error: Unmanaged<CFError>?
        let verified = SecKeyVerifySignature(
            publicKey,
            signatureAlgorithm,
            inputData as CFData,
            signatureData as CFData,
            &error
        )

        if let err = error?.takeRetainedValue() {
            reject("verification_failed", err.localizedDescription, err as Error)
            return
        }

        resolve(verified)
    }

}
