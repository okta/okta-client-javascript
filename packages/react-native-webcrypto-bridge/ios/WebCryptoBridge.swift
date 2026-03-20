import Foundation
import Security
import CommonCrypto
import React

@objc(WebCryptoBridge)
class WebCryptoBridge: NSObject {

    // Key storage
    private static var keyStore: [String: [String: Any]] = [:]
    private static let keyStoreLock = NSLock()

    @objc
    static func requiresMainQueueSetup() -> Bool {
        return false
    }
    
    // MARK: - Helper Methods
    
    private func byteArrayToData(_ byteArray: [NSNumber]) -> Data {
        var data = Data(capacity: byteArray.count)
        for byte in byteArray {
            data.append(byte.uint8Value)
        }
        return data
    }
    
    private func dataToByteArray(_ data: Data) -> [NSNumber] {
        return data.map { NSNumber(value: $0) }
    }
    
    // MARK: - Synchronous Methods
    
    @objc(getRandomValues:)
    func getRandomValues(_ length: Double) -> [NSNumber] {
        let len = Int(length)
        var randomData = Data(count: len)
        
        let result = randomData.withUnsafeMutableBytes { bytes -> Int32 in
            guard let baseAddress = bytes.baseAddress else {
                return errSecParam
            }
            return SecRandomCopyBytes(kSecRandomDefault, len, baseAddress)
        }
        
        if result != errSecSuccess {
            return []
        }
        
        return dataToByteArray(randomData)
    }
    
    @objc
    func randomUUID() -> String {
        return UUID().uuidString.lowercased()
    }
    
    // MARK: - Async Methods
    
    @objc(digest:data:resolve:reject:)
    func digest(
        _ algorithm: String,
        data: [NSNumber],
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        guard algorithm == "SHA-256" else {
            reject("unsupported_algorithm", "Only SHA-256 is supported", nil)
            return
        }
        
        let inputData = byteArrayToData(data)
        
        var hash = [UInt8](repeating: 0, count: Int(CC_SHA256_DIGEST_LENGTH))
        inputData.withUnsafeBytes { bytes in
            _ = CC_SHA256(bytes.baseAddress, CC_LONG(inputData.count), &hash)
        }
        
        let hashData = Data(hash)
        let result = dataToByteArray(hashData)
        
        resolve(result)
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
            reject("key_generation_failed", err?.localizedDescription ?? "Unknown error", err as? Error)
            return
        }
        
        guard let publicKey = SecKeyCopyPublicKey(privateKey) else {
            reject("key_generation_failed", "Failed to get public key", nil)
            return
        }
        
        let keyId = UUID().uuidString
        
        Self.keyStoreLock.lock()
        Self.keyStore[keyId] = [
            "publicKey": publicKey,
            "privateKey": privateKey,
            "extractable": extractable
        ]
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
        let keyPair = Self.keyStore[keyId]
        Self.keyStoreLock.unlock()
        
        guard let keyPair = keyPair,
              let key = keyPair[keyType == "public" ? "publicKey" : "privateKey"] as? SecKey else {
            reject("key_not_found", "Key not found", nil)
            return
        }
        
        var error: Unmanaged<CFError>?
        guard let keyData = SecKeyCopyExternalRepresentation(key, &error) as Data? else {
            let err = error?.takeRetainedValue()
            reject("export_failed", err?.localizedDescription ?? "Export failed", err as? Error)
            return
        }
        
        // Create JWK (simplified - proper ASN.1 parsing would be better)
        var jwk: [String: Any] = [
            "kty": "RSA",
            "alg": "RS256"
        ]
        
        // Extract RSA components (simplified)
        if keyType == "public" {
            let modulus = extractModulus(from: keyData)
            let exponent = Data([0x01, 0x00, 0x01]) // Standard exponent (65537)
            
            jwk["n"] = modulus.base64EncodedString()
            jwk["e"] = exponent.base64EncodedString()
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
              let modulusData = Data(base64Encoded: nString),
              let exponentData = Data(base64Encoded: eString) else {
            reject("invalid_jwk", "Invalid JWK components", nil)
            return
        }
        
        // Build RSA public key data (simplified)
        let isPrivateKey = keyUsages.contains("sign")
        
        let keyId = UUID().uuidString
        
        // For now, reject private key import as it requires more complex handling
        if isPrivateKey {
            reject("not_implemented", "Private key import not yet implemented", nil)
            return
        }
        
        // Import public key
        var error: Unmanaged<CFError>?
        let attributes: [String: Any] = [
            kSecAttrKeyType as String: kSecAttrKeyTypeRSA,
            kSecAttrKeyClass as String: kSecAttrKeyClassPublic,
            kSecAttrKeySizeInBits as String: modulusData.count * 8
        ]
        
        // Construct key data (simplified - proper ASN.1 encoding needed)
        let keyData = constructRSAPublicKeyData(modulus: modulusData, exponent: exponentData)
        
        guard let publicKey = SecKeyCreateWithData(keyData as CFData, attributes as CFDictionary, &error) else {
            let err = error?.takeRetainedValue()
            reject("import_failed", err?.localizedDescription ?? "Import failed", err as? Error)
            return
        }
        
        Self.keyStoreLock.lock()
        Self.keyStore[keyId] = [
            "publicKey": publicKey,
            "extractable": extractable
        ]
        Self.keyStoreLock.unlock()
        
        resolve(keyId)
    }
    
    @objc(sign:keyId:data:resolve:reject:)
    func sign(
        _ algorithmJson: String,
        keyId: String,
        data: [NSNumber],
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        Self.keyStoreLock.lock()
        let keyPair = Self.keyStore[keyId]
        Self.keyStoreLock.unlock()
        
        guard let keyPair = keyPair,
              let privateKey = keyPair["privateKey"] as? SecKey else {
            reject("key_not_found", "Private key not found", nil)
            return
        }
        
        let inputData = byteArrayToData(data)
        
        var error: Unmanaged<CFError>?
        guard let signature = SecKeyCreateSignature(
            privateKey,
            .rsaSignatureMessagePKCS1v15SHA256,
            inputData as CFData,
            &error
        ) as Data? else {
            let err = error?.takeRetainedValue()
            reject("signing_failed", err?.localizedDescription ?? "Signing failed", err as? Error)
            return
        }
        
        let result = dataToByteArray(signature)
        resolve(result)
    }
    
    @objc(verify:keyId:signature:data:resolve:reject:)
    func verify(
        _ algorithmJson: String,
        keyId: String,
        signature: [NSNumber],
        data: [NSNumber],
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        Self.keyStoreLock.lock()
        let keyPair = Self.keyStore[keyId]
        Self.keyStoreLock.unlock()
        
        guard let keyPair = keyPair,
              let publicKey = keyPair["publicKey"] as? SecKey else {
            reject("key_not_found", "Public key not found", nil)
            return
        }
        
        let inputData = byteArrayToData(data)
        let signatureData = byteArrayToData(signature)
        
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
    
    // MARK: - Helper Methods for RSA Key Handling
    
    private func extractModulus(from keyData: Data) -> Data {
        // Simplified extraction - skip ASN.1 header
        // In production, use proper ASN.1 parsing
        let offset = min(24, keyData.count)
        let length = min(256, keyData.count - offset)
        return keyData.subdata(in: offset..<(offset + length))
    }
    
    private func constructRSAPublicKeyData(modulus: Data, exponent: Data) -> Data {
        // Simplified RSA public key construction
        // In production, use proper ASN.1 encoding
        var keyData = Data()
        
        // Add modulus
        keyData.append(modulus)
        
        // Add exponent
        keyData.append(exponent)
        
        return keyData
    }
}

#ifdef RCT_NEW_ARCH_ENABLED
extension WebCryptoBridge: NativeWebCryptoBridgeSpec {}
#endif