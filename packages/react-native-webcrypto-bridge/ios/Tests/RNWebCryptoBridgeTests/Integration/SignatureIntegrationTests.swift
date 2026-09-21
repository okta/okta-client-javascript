import XCTest
@testable import RNWebCryptoBridge

/// Integration tests for signing/verification workflows
/// Tests coordination between AlgorithmRegistry and RSAHandler for signature operations
class SignatureIntegrationTests: WebCryptoBridgeIntegrationTestCase {

    func testSignatureAlgorithm_RSA_returnsPKCS1v15SHA256() {
        guard let handler = getHandlerByAlgorithm( "RSASSA-PKCS1-v1_5") as? RSAHandler else {
            XCTFail("RSA handler not found")
            return
        }

        let algorithm = handler.getSignatureAlgorithm()
        XCTAssertEqual(algorithm, .rsaSignatureMessagePKCS1v15SHA256)
    }

    func testSign_noKeyId_fails() {
        let keyId = "nonexistent-key"
        let storedKey = getStoredKey(withId: keyId)
        XCTAssertNil(storedKey)
    }

    func testSign_validKey_requiresHandler() {
        let keyId = generateTestKey()
        guard let storedKey = getStoredKey(withId: keyId) else {
            XCTFail("Failed to generate test key")
            return
        }

        // Verify key exists
        XCTAssertEqual(storedKey.id, keyId)
        XCTAssertEqual(storedKey.keyType, "private")

        // Get handler for the algorithm
        guard let handler = getHandlerByAlgorithm( "RSASSA-PKCS1-v1_5") as? RSAHandler else {
            XCTFail("RSA handler not found")
            return
        }

        // Verify handler can process the algorithm
        let algorithm = handler.getSignatureAlgorithm()
        XCTAssertNotNil(algorithm)
    }

    func testVerify_requiresPublicKey() {
        let publicKeyId = generatePublicKeyForJWK()
        guard let storedKey = getStoredKey(withId: publicKeyId) else {
            XCTFail("Failed to generate test key")
            return
        }

        // Verify key is public
        XCTAssertEqual(storedKey.keyType, "public")
        XCTAssertTrue(storedKey.keyUsages.contains("verify"))
    }

    func testKeyUsages_sign_and_verify() {
        let keyId = generateTestKey()
        guard let storedKey = getStoredKey(withId: keyId) else {
            XCTFail("Failed to generate test key")
            return
        }

        let expectedUsages = ["sign", "verify"]
        XCTAssertEqual(storedKey.keyUsages, expectedUsages)
    }

    func testKeyUsages_verify_only() {
        let publicKeyId = generatePublicKeyForJWK()
        guard let storedKey = getStoredKey(withId: publicKeyId) else {
            XCTFail("Failed to generate test key")
            return
        }

        XCTAssertTrue(storedKey.keyUsages.contains("verify"))
        XCTAssertFalse(storedKey.keyUsages.contains("sign"))
    }

    func testErrorHandling_invalidAlgorithm() {
        let invalidAlgorithmName = "UNSUPPORTED_SIGNATURE_ALGORITHM"
        let handler = getHandlerByAlgorithm( invalidAlgorithmName)
        XCTAssertNil(handler)
    }

    func testErrorHandling_keyTypeMismatch() {
        // Public key should not be usable for signing
        let publicKeyId = generatePublicKeyForJWK()
        guard let storedKey = getStoredKey(withId: publicKeyId) else {
            XCTFail("Failed to generate public key")
            return
        }

        // Verify key is indeed public and not suitable for signing
        XCTAssertEqual(storedKey.keyType, "public")
        XCTAssertFalse(storedKey.keyUsages.contains("sign"))
    }

    func testSignatureWorkflow_keyDispatch() {
        let privateKeyId = generateTestKey()
        guard let privateKey = getStoredKey(withId: privateKeyId) else {
            XCTFail("Failed to generate private key")
            return
        }

        // Verify key has sign usage
        XCTAssertTrue(privateKey.keyUsages.contains("sign"))

        // Get handler for the algorithm
        guard let algorithm = (privateKey.algorithm["name"] as? String).flatMap({ getAlgorithmName(for: $0) }) else {
            // Algorithm lookup by key type
            XCTAssertNotNil(getAlgorithmName(for: "RSA"))
            return
        }

        // Get handler
        guard let handler = getHandlerByAlgorithm( algorithm) as? RSAHandler else {
            XCTFail("Handler not found for algorithm")
            return
        }

        let signatureAlgorithm = handler.getSignatureAlgorithm()
        XCTAssertEqual(signatureAlgorithm, .rsaSignatureMessagePKCS1v15SHA256)
    }

    func testVerificationWorkflow_keyDispatch() {
        let publicKeyId = generatePublicKeyForJWK()
        guard let publicKey = getStoredKey(withId: publicKeyId) else {
            XCTFail("Failed to generate public key")
            return
        }

        // Verify key has verify usage
        XCTAssertTrue(publicKey.keyUsages.contains("verify"))

        // Get handler for the algorithm
        guard let algorithmName = getAlgorithmName(for: "RSA") else {
            XCTFail("Algorithm name not found")
            return
        }
        XCTAssertEqual(algorithmName, "RSASSA-PKCS1-v1_5")

        guard let handler = getHandlerByAlgorithm(algorithmName) as? RSAHandler else {
            XCTFail("Handler not found")
            return
        }

        let signatureAlgorithm = handler.getSignatureAlgorithm()
        XCTAssertEqual(signatureAlgorithm, SecKeyAlgorithm.rsaSignatureMessagePKCS1v15SHA256)
    }

    func testMultipleKeys_differentOperations() {
        let privateKeyId = generateTestKey()
        let publicKeyId = generatePublicKeyForJWK()

        guard let privateKey = getStoredKey(withId: privateKeyId),
              let publicKey = getStoredKey(withId: publicKeyId) else {
            XCTFail("Failed to generate keys")
            return
        }

        // Private key should have sign usage
        XCTAssertTrue(privateKey.keyUsages.contains("sign"))

        // Public key should have verify usage
        XCTAssertTrue(publicKey.keyUsages.contains("verify"))

        // Keys should be distinct
        XCTAssertNotEqual(privateKeyId, publicKeyId)
    }

    func testSignatureAlgorithmSelection_consistency() {
        guard let handler1 = getHandlerByAlgorithm("RSASSA-PKCS1-v1_5") as? RSAHandler,
              let handler2 = getHandlerByKeyType("RSA") as? RSAHandler else {
            XCTFail("Handler not found")
            return
        }

        let algorithm1 = handler1.getSignatureAlgorithm()
        let algorithm2 = handler2.getSignatureAlgorithm()

        XCTAssertEqual(algorithm1, algorithm2)
        XCTAssertEqual(algorithm1, SecKeyAlgorithm.rsaSignatureMessagePKCS1v15SHA256)
    }
}
