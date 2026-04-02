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

// MARK: - Key Entry

/// Type-safe key storage entry, replacing the previous `[String: Any]` dictionary.
struct KeyEntry {
    let publicKey: SecKey
    let privateKey: SecKey?
    let extractable: Bool
}

// MARK: - WebCryptoBridge

@objc(WebCryptoBridge)
class WebCryptoBridge: NSObject {

    // Key storage — typed struct instead of [String: Any]
    private static var keyStore: [String: KeyEntry] = [:]
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
              algorithm["name"] as? String == "RSASSA-PKCS1-v1_5" else {
            reject("unsupported_algorithm", "Only RSASSA-PKCS1-v1_5 is supported", nil)
            return
        }

        let attributes: [String: Any] = [
            kSecAttrKeyType as String: kSecAttrKeyTypeRSA,
            kSecAttrKeySizeInBits as String: 2048,
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
        Self.keyStore[keyId] = KeyEntry(
            publicKey: publicKey,
            privateKey: privateKey,
            extractable: extractable
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

    @objc(exportKey:keyId:keyType:resolve:reject:)
    func exportKey(
        _ format: String,
        keyId: String,
        keyType: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        guard format == "jwk" else {
            reject("unsupported_format", "Only JWK format is supported", nil)
            return
        }

        Self.keyStoreLock.lock()
        let entry = Self.keyStore[keyId]
        Self.keyStoreLock.unlock()

        guard let entry = entry else {
            reject("key_not_found", "Key not found", nil)
            return
        }

        let key: SecKey
        if keyType == "public" {
            key = entry.publicKey
        } else {
            guard let privateKey = entry.privateKey else {
                reject("key_not_found", "Private key not available for this key", nil)
                return
            }
            key = privateKey
        }

        var error: Unmanaged<CFError>?
        guard let keyData = SecKeyCopyExternalRepresentation(key, &error) as Data? else {
            let err = error?.takeRetainedValue()
            reject("export_failed", err?.localizedDescription ?? "Export failed", err)
            return
        }

        var jwk: [String: Any] = [
            "kty": "RSA",
            "alg": "RS256"
        ]

        if keyType == "public" {
            // SecKeyCopyExternalRepresentation returns PKCS#1 RSAPublicKey for RSA public keys:
            // SEQUENCE { INTEGER modulus, INTEGER exponent }
            guard let components = RSAPublicKeyComponents(derData: keyData) else {
                reject("export_failed", "Failed to parse RSA public key components", nil)
                return
            }
            jwk["n"] = components.modulus.base64URLEncodedString()
            jwk["e"] = components.exponent.base64URLEncodedString()
        }

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
              jwk["kty"] as? String == "RSA" else {
            reject("invalid_jwk", "Invalid JWK format", nil)
            return
        }

        guard let nString = jwk["n"] as? String,
              let eString = jwk["e"] as? String,
              let modulusData = Data(base64Encoded: nString.base64URLDecoded),
              let exponentData = Data(base64Encoded: eString.base64URLDecoded) else {
            reject("invalid_jwk", "Invalid JWK components", nil)
            return
        }

        let keyId = UUID().uuidString

        let components = RSAPublicKeyComponents(modulus: modulusData, exponent: exponentData)
        let publicKeyData = components.derData

        // Key size is derived from the modulus, not the DER blob
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
        Self.keyStore[keyId] = KeyEntry(
            publicKey: publicKey,
            privateKey: nil,
            extractable: extractable
        )
        Self.keyStoreLock.unlock()

        resolve(keyId)
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
        let entry = Self.keyStore[keyId]
        Self.keyStoreLock.unlock()

        guard let entry = entry else {
            reject("key_not_found", "Key not found", nil)
            return
        }

        guard let privateKey = entry.privateKey else {
            reject("key_not_found", "Private key not available for this key", nil)
            return
        }

        guard let inputData = base64ToData(data) else {
            reject("invalid_input", "Invalid Base64 input data", nil)
            return
        }

        var error: Unmanaged<CFError>?
        guard let signature = SecKeyCreateSignature(
            privateKey,
            .rsaSignatureMessagePKCS1v15SHA256,
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
        let entry = Self.keyStore[keyId]
        Self.keyStoreLock.unlock()

        guard let entry = entry else {
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

        let publicKey = entry.publicKey

        var error: Unmanaged<CFError>?
        let verified = SecKeyVerifySignature(
            publicKey,
            .rsaSignatureMessagePKCS1v15SHA256,
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
