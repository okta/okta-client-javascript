import XCTest
@testable import RNWebCryptoBridge

/// Integration tests for key generation workflows
/// Tests coordination between AlgorithmRegistry and RSAHandler
class KeyGenerationIntegrationTests: WebCryptoBridgeIntegrationTestCase {

    func testGenerateKeySpec_validRSA2048_succeeds() {
        let algorithmParams: [String: Any] = ["modulusLength": 2048]

        // Get handler from registry
        guard let handler = getHandlerByAlgorithm("RSASSA-PKCS1-v1_5") as? RSAHandler else {
            XCTFail("RSA handler not found in registry")
            return
        }

        // Generate key spec
        do {
            let keySpec = try handler.generateKeySpec(algorithmParams)
            assertRSAKeySpec(keySpec, expectedKeySize: 2048)
        } catch {
            XCTFail("Failed to generate key spec: \(error)")
        }
    }

    func testGenerateKeySpec_unsupportedAlgorithm_rejects() {
        // Get handler for non-existent algorithm
        let handler = getHandlerByAlgorithm("UNSUPPORTED-ALGORITHM")
        XCTAssertNil(handler)
    }

    func testGenerateKeySpec_invalidModulusLength_throws() {
        guard let handler = getHandlerByAlgorithm("RSASSA-PKCS1-v1_5") as? RSAHandler else {
            XCTFail("RSA handler not found")
            return
        }

        let invalidParams: [String: Any] = ["modulusLength": 1024]

        do {
            _ = try handler.generateKeySpec(invalidParams)
            XCTFail("Should have thrown error for 1024-bit key")
        } catch {
            // Expected
            XCTAssertTrue(error is NSError)
        }
    }

    func testGenerateKeySpec_missing4096Bit_throws() {
        guard let handler = getHandlerByAlgorithm("RSASSA-PKCS1-v1_5") as? RSAHandler else {
            XCTFail("RSA handler not found")
            return
        }

        let invalidParams: [String: Any] = ["modulusLength": 4096]

        do {
            _ = try handler.generateKeySpec(invalidParams)
            XCTFail("Should have thrown error for 4096-bit key")
        } catch {
            // Expected
            XCTAssertTrue(error is NSError)
        }
    }

    func testGenerateKeySpec_emptyParams_usesDefault() {
        guard let handler = getHandlerByAlgorithm("RSASSA-PKCS1-v1_5") as? RSAHandler else {
            XCTFail("RSA handler not found")
            return
        }

        do {
            let keySpec = try handler.generateKeySpec([:])
            assertRSAKeySpec(keySpec, expectedKeySize: 2048)
        } catch {
            XCTFail("Failed to generate key spec with empty params: \(error)")
        }
    }

    func testKeyUsages_valid_sign_verify() {
        let expectedUsages = ["sign", "verify"]
        let algorithm: [String: Any] = [
            "name": "RSASSA-PKCS1-v1_5",
            "modulusLength": 2048
        ]

        // Store a key with valid usages
        let keyId = UUID().uuidString
        let key = MockCryptoKey(
            id: keyId,
            algorithm: algorithm,
            keyType: "private",
            keyUsages: expectedUsages,
            extractable: false
        )
        mockKeyStore.store(key, withId: keyId)

        // Retrieve and validate
        guard let storedKey = getStoredKey(withId: keyId) else {
            XCTFail("Failed to store key")
            return
        }

        XCTAssertEqual(storedKey.keyUsages, expectedUsages)
    }

    func testKeyUsages_invalid_extractable() {
        let algorithm: [String: Any] = [
            "name": "RSASSA-PKCS1-v1_5",
            "modulusLength": 2048
        ]

        // Create a key with invalid usage
        let keyId = UUID().uuidString
        let key = MockCryptoKey(
            id: keyId,
            algorithm: algorithm,
            keyType: "private",
            keyUsages: ["invalid_usage"],
            extractable: false
        )

        // Validate that we can detect invalid usages
        XCTAssertEqual(key.keyUsages, ["invalid_usage"])
        XCTAssertFalse(key.keyUsages.contains("sign"))
    }

    func testMultipleKeys_createDistinctIds() {
        let keyId1 = generateTestKey()
        let keyId2 = generateTestKey()

        XCTAssertNotEqual(keyId1, keyId2)
        XCTAssertNotNil(getStoredKey(withId: keyId1))
        XCTAssertNotNil(getStoredKey(withId: keyId2))
    }

    func testHandlerRegistry_dispatchByAlgorithm() {
        // Test that registry correctly dispatches to RSA handler
        let handler = getHandlerByAlgorithm("RSASSA-PKCS1-v1_5")
        assertHandler(handler, isType: RSAHandler.self)
    }

    func testHandlerRegistry_dispatchByKeyType() {
        // Test that registry correctly maps RSA key type to handler
        let handler = getHandlerByKeyType("RSA")
        assertHandler(handler, isType: RSAHandler.self)
    }

    func testAlgorithmMapping_RSA_to_RSASSA() {
        let algorithmName = getAlgorithmName(for: "RSA")
        XCTAssertEqual(algorithmName, "RSASSA-PKCS1-v1_5")
    }

    func testAlgorithmMapping_EC_to_ECDSA() {
        let algorithmName = getAlgorithmName(for: "EC")
        XCTAssertEqual(algorithmName, "ECDSA")
    }

    func testAlgorithmMapping_OKP_to_EdDSA() {
        let algorithmName = getAlgorithmName(for: "OKP")
        XCTAssertEqual(algorithmName, "EdDSA")
    }

    func testAlgorithmMapping_unknown_returnsNil() {
        let algorithmName = getAlgorithmName(for: "UNKNOWN")
        XCTAssertNil(algorithmName)
    }
}
