import XCTest
@testable import RNWebCryptoBridge

/// Integration tests for JWK export/import workflows
/// Tests coordination between AlgorithmRegistry, RSAHandler, and key storage
class JWKIntegrationTests: WebCryptoBridgeIntegrationTestCase {

    func testExportKey_publicKey_producesValidJWK() {
        guard let handler = getHandlerByAlgorithm( "RSASSA-PKCS1-v1_5") as? RSAHandler else {
            XCTFail("RSA handler not found")
            return
        }

        // Create test RSA key components
        let modulus = Data("test_modulus_data".utf8)
        let exponent = Data("65537".utf8)
        let keyComponents = RSAPublicKeyComponents(modulus: modulus, exponent: exponent)

        // Export to JWK
        let jwk = handler.exportToJWK(publicKey: nil as SecKey?, keyComponents: keyComponents)

        // Validate JWK structure
        assertValidRSAJWK(jwk)
        XCTAssertNotNil(jwk["n"] as? String)
        XCTAssertNotNil(jwk["e"] as? String)
    }

    func testExportKey_unknownKeyId_fails() {
        let keyId = "nonexistent-key-id"
        let storedKey = getStoredKey(withId: keyId)
        XCTAssertNil(storedKey)
    }

    func testImportKey_validJWK_succeeds() {
        guard let handler = getHandlerByAlgorithm( "RSASSA-PKCS1-v1_5") as? RSAHandler else {
            XCTFail("RSA handler not found")
            return
        }

        let testJWK: [String: Any] = [
            "kty": "RSA",
            "alg": "RS256",
            "n": "0vx7agoebGcQSuuPiLJXZptN9nndrQmbXEps2aiAFbWhM78LhWx4cbbfAAtVT86zwu1RK7aPFFxuhDR1L6tSoc_BJECPebWKRXjBZCiFV4n3oknjhMstn64tZ_2W-5JsGY4Hc5n9yBXArwl93lqt7_RN5w6Cf0h4QyQ5v-65YGjQR0_FDW2QvzqY368QQMicAtaSqzs8KJZgnYb9c7d0zgdAZHzu6qMQvRL5hajrn1n91CbOpbISD08qNLyrdkt-bFTWhAI4vMQFh6WeZu0fM4lFd2NcRwr3XPksINHaQ-G_xBniIqbw0Ls1jF44-csFCur-kEgU8awapJzKnqDKgw",
            "e": "AQAB"
        ]

        let components = handler.importFromJWK(testJWK)
        XCTAssertNotNil(components)
        XCTAssertNotNil(components?.modulus)
        XCTAssertNotNil(components?.exponent)
    }

    func testImportKey_missingModulus_fails() {
        guard let handler = getHandlerByAlgorithm( "RSASSA-PKCS1-v1_5") as? RSAHandler else {
            XCTFail("RSA handler not found")
            return
        }

        let incompleteJWK: [String: Any] = [
            "kty": "RSA",
            "e": "AQAB"
        ]

        let components = handler.importFromJWK(incompleteJWK)
        XCTAssertNil(components)
    }

    func testImportKey_missingExponent_fails() {
        guard let handler = getHandlerByAlgorithm( "RSASSA-PKCS1-v1_5") as? RSAHandler else {
            XCTFail("RSA handler not found")
            return
        }

        let incompleteJWK: [String: Any] = [
            "kty": "RSA",
            "n": "0vx7agoebGcQSuuPiLJXZptN9nndrQmbXEps2aiAFbWhM78LhWx4cbbfAAtVT86zwu1RK7aPFFxuhDR1L6tSoc_BJECPebWKRXjBZCiFV4n3oknjhMstn64tZ_2W-5JsGY4Hc5n9yBXArwl93lqt7_RN5w6Cf0h4QyQ5v-65YGjQR0_FDW2QvzqY368QQMicAtaSqzs8KJZgnYb9c7d0zgdAZHzu6qMQvRL5hajrn1n91CbOpbISD08qNLyrdkt-bFTWhAI4vMQFh6WeZu0fM4lFd2NcRwr3XPksINHaQ-G_xBniIqbw0Ls1jF44-csFCur-kEgU8awapJzKnqDKgw"
        ]

        let components = handler.importFromJWK(incompleteJWK)
        XCTAssertNil(components)
    }

    func testRoundTrip_exportThenImport() {
        guard let handler = getHandlerByAlgorithm( "RSASSA-PKCS1-v1_5") as? RSAHandler else {
            XCTFail("RSA handler not found")
            return
        }

        // Create original components
        let originalModulus = Data("test_modulus".utf8)
        let originalExponent = Data("65537".utf8)
        let originalComponents = RSAPublicKeyComponents(
            modulus: originalModulus,
            exponent: originalExponent
        )

        // Export to JWK
        let jwk = handler.exportToJWK(publicKey: nil as SecKey?, keyComponents: originalComponents)

        // Import back
        guard let reimportedComponents = handler.importFromJWK(jwk) else {
            XCTFail("Failed to import JWK")
            return
        }

        // Verify components match
        XCTAssertEqual(reimportedComponents.modulus, originalModulus)
        XCTAssertEqual(reimportedComponents.exponent, originalExponent)
    }

    func testJWK_multipleRoundTrips() {
        guard let handler = getHandlerByAlgorithm( "RSASSA-PKCS1-v1_5") as? RSAHandler else {
            XCTFail("RSA handler not found")
            return
        }

        let testCases: [(modulus: Data, exponent: Data)] = [
            (Data([0x12, 0x34]), Data([0x65, 0x37])),
            (Data("test".utf8), Data("exponent".utf8)),
            (Data(repeating: 0xFF, count: 32), Data([0x01, 0x00, 0x01]))
        ]

        for testCase in testCases {
            let original = RSAPublicKeyComponents(
                modulus: testCase.modulus,
                exponent: testCase.exponent
            )

            // First export/import cycle
            let jwk1 = handler.exportToJWK(publicKey: nil as SecKey?, keyComponents: original)
            guard let reimported1 = handler.importFromJWK(jwk1) else {
                XCTFail("Failed first import cycle")
                return
            }

            // Second export/import cycle
            let jwk2 = handler.exportToJWK(publicKey: nil as SecKey?, keyComponents: reimported1)
            guard let reimported2 = handler.importFromJWK(jwk2) else {
                XCTFail("Failed second import cycle")
                return
            }

            // Verify stability
            XCTAssertEqual(reimported1.modulus, reimported2.modulus)
            XCTAssertEqual(reimported1.exponent, reimported2.exponent)
        }
    }

    func testJWK_structure_validation() {
        guard let handler = getHandlerByAlgorithm( "RSASSA-PKCS1-v1_5") as? RSAHandler else {
            XCTFail("RSA handler not found")
            return
        }

        let modulus = Data("modulus".utf8)
        let exponent = Data("exp".utf8)
        let components = RSAPublicKeyComponents(modulus: modulus, exponent: exponent)

        let jwk = handler.exportToJWK(publicKey: nil as SecKey?, keyComponents: components)

        // Validate structure
        XCTAssertEqual(jwk["kty"] as? String, "RSA")
        XCTAssertEqual(jwk["alg"] as? String, "RS256")
        XCTAssertNotNil(jwk["n"])
        XCTAssertNotNil(jwk["e"])
        XCTAssertNil(jwk["d"])  // Private exponent should not be present
    }

    func testKeyStorage_storeAndRetrieveJWK() {
        let keyId = UUID().uuidString
        let algorithm: [String: Any] = [
            "name": "RSASSA-PKCS1-v1_5",
            "modulusLength": 2048
        ]

        var key = MockCryptoKey(
            id: keyId,
            algorithm: algorithm,
            keyType: "public",
            keyUsages: ["verify"],
            extractable: true
        )

        // Store JWK components
        key.keyData = [
            "n": "0vx7agoebGcQSuuPiLJXZptN9nndrQmbXEps2aiAFbWhM78LhWx4cbbfAAtVT86zwu1RK7aPFFxuhDR1L6tSoc_BJECPebWKRXjBZCiFV4n3oknjhMstn64tZ_2W-5JsGY4Hc5n9yBXArwl93lqt7_RN5w6Cf0h4QyQ5v-65YGjQR0_FDW2QvzqY368QQMicAtaSqzs8KJZgnYb9c7d0zgdAZHzu6qMQvRL5hajrn1n91CbOpbISD08qNLyrdkt-bFTWhAI4vMQFh6WeZu0fM4lFd2NcRwr3XPksINHaQ-G_xBniIqbw0Ls1jF44-csFCur-kEgU8awapJzKnqDKgw",
            "e": "AQAB"
        ]

        mockKeyStore.store(key, withId: keyId)

        // Retrieve and validate
        guard let storedKey = getStoredKey(withId: keyId) else {
            XCTFail("Failed to retrieve stored key")
            return
        }

        XCTAssertEqual(storedKey.id, keyId)
        XCTAssertNotNil(storedKey.keyData["n"])
        XCTAssertNotNil(storedKey.keyData["e"])
    }
}
