import XCTest
import Security
import Foundation
@testable import RNWebCryptoBridge

class RSAHandlerTests: XCTestCase {

    let handler = RSAHandler()

    func testGenerateKeySpec_valid2048BitRequest() throws {
        let params: [String: Any] = ["modulusLength": 2048]

        let keyGenSpec = try handler.generateKeySpec(params)

        XCTAssertEqual(keyGenSpec.keyType as String, kSecAttrKeyTypeRSA as String)
        XCTAssertEqual(keyGenSpec.keySize, 2048)
    }

    func testGenerateKeySpec_invalid1024Bit_throws() {
        let params: [String: Any] = ["modulusLength": 1024]

        XCTAssertThrowsError(try handler.generateKeySpec(params)) { error in
            let nsError = error as NSError
            XCTAssertEqual(nsError.domain, "RSAHandler")
            XCTAssertTrue(nsError.localizedDescription.contains("2048-bit"))
        }
    }

    func testGenerateKeySpec_invalid4096Bit_throws() {
        let params: [String: Any] = ["modulusLength": 4096]

        XCTAssertThrowsError(try handler.generateKeySpec(params)) { error in
            let nsError = error as NSError
            XCTAssertEqual(nsError.domain, "RSAHandler")
            XCTAssertTrue(nsError.localizedDescription.contains("2048-bit"))
        }
    }

    func testGenerateKeySpec_missingModulusLength_usesDefault() throws {
        let params: [String: Any] = [:]

        let keyGenSpec = try handler.generateKeySpec(params)

        XCTAssertEqual(keyGenSpec.keySize, 2048)
    }

    func testGetSignatureAlgorithm_returnsRSAPKCS1v15SHA256() {
        let algorithm = handler.getSignatureAlgorithm()
        XCTAssertEqual(algorithm, .rsaSignatureMessagePKCS1v15SHA256)
    }

    func testExportToJWK_producesValidRSAJWK() {
        // Create test components
        let testModulus = Data("12345678901234567890".utf8)
        let testExponent = Data("65537".utf8)
        let keyComponents = RSAPublicKeyComponents(modulus: testModulus, exponent: testExponent)

        // Export to JWK (publicKey parameter is unused in this implementation)
        let dummyPublicKey = SecKey() // Placeholder
        let jwk = handler.exportToJWK(publicKey: dummyPublicKey, keyComponents: keyComponents)

        XCTAssertEqual(jwk["kty"] as? String, "RSA")
        XCTAssertEqual(jwk["alg"] as? String, "RS256")
        XCTAssertNotNil(jwk["n"] as? String)
        XCTAssertNotNil(jwk["e"] as? String)
    }

    func testExportToJWK_encodesComponentsCorrectly() {
        let testModulus = Data([0x12, 0x34, 0x56, 0x78])
        let testExponent = Data([0x01, 0x00, 0x01])
        let keyComponents = RSAPublicKeyComponents(modulus: testModulus, exponent: testExponent)

        let dummyPublicKey = SecKey()
        let jwk = handler.exportToJWK(publicKey: dummyPublicKey, keyComponents: keyComponents)

        // Verify modulus encoding
        if let encodedN = jwk["n"] as? String {
            let decodedN = Data(base64Encoded: encodedN.base64URLDecoded)
            XCTAssertEqual(decodedN, testModulus)
        } else {
            XCTFail("Modulus not found in JWK")
        }

        // Verify exponent encoding
        if let encodedE = jwk["e"] as? String {
            let decodedE = Data(base64Encoded: encodedE.base64URLDecoded)
            XCTAssertEqual(decodedE, testExponent)
        } else {
            XCTFail("Exponent not found in JWK")
        }
    }

    func testImportFromJWK_reconstructsComponents() {
        // Create original components
        let originalModulus = Data("12345678901234567890".utf8)
        let originalExponent = Data("65537".utf8)
        let originalComponents = RSAPublicKeyComponents(modulus: originalModulus, exponent: originalExponent)

        // Export to JWK
        let dummyPublicKey = SecKey()
        let jwk = handler.exportToJWK(publicKey: dummyPublicKey, keyComponents: originalComponents)

        // Import back
        let importedComponents = handler.importFromJWK(jwk)

        XCTAssertNotNil(importedComponents)
        XCTAssertEqual(importedComponents?.modulus, originalModulus)
        XCTAssertEqual(importedComponents?.exponent, originalExponent)
    }

    func testImportFromJWK_missingModulus_returnsNil() {
        let jwk: [String: Any] = [
            "e": "AQAB"
        ]

        let components = handler.importFromJWK(jwk)
        XCTAssertNil(components)
    }

    func testImportFromJWK_missingExponent_returnsNil() {
        let jwk: [String: Any] = [
            "n": "some_base64_data"
        ]

        let components = handler.importFromJWK(jwk)
        XCTAssertNil(components)
    }

    func testImportFromJWK_invalidBase64_returnsNil() {
        let jwk: [String: Any] = [
            "n": "not valid base64!@#$%^&*()",
            "e": "also invalid!@#$%^&*()"
        ]

        let components = handler.importFromJWK(jwk)
        XCTAssertNil(components)
    }

    func testRoundTrip_exportAndImport() {
        let testCases: [(modulus: Data, exponent: Data)] = [
            (Data([0x12, 0x34]), Data([0x65, 0x37])),
            (Data("test_modulus".utf8), Data("test_exponent".utf8)),
            (Data(repeating: 0xFF, count: 256), Data([0x01, 0x00, 0x01]))
        ]

        for testCase in testCases {
            let originalComponents = RSAPublicKeyComponents(
                modulus: testCase.modulus,
                exponent: testCase.exponent
            )

            let dummyPublicKey = SecKey()
            let jwk = handler.exportToJWK(publicKey: dummyPublicKey, keyComponents: originalComponents)

            let reimportedComponents = handler.importFromJWK(jwk)

            XCTAssertNotNil(reimportedComponents)
            XCTAssertEqual(reimportedComponents?.modulus, testCase.modulus)
            XCTAssertEqual(reimportedComponents?.exponent, testCase.exponent)
        }
    }
}
