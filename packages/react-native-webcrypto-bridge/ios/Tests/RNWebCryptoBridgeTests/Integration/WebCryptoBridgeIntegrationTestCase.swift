import XCTest
@testable import RNWebCryptoBridge

/// Base class for all integration tests
/// Provides test infrastructure for module-level component coordination
class WebCryptoBridgeIntegrationTestCase: XCTestCase {

    let registry = AlgorithmRegistry.shared
    let mockKeyStore = MockKeyStore.shared

    override func setUp() {
        super.setUp()
        // Clear key store before each test
        mockKeyStore.clear()
    }

    override func tearDown() {
        super.tearDown()
        mockKeyStore.clear()
    }

    /// Test helper for async operations with timeout
    /// - Parameters:
    ///   - timeout: Maximum time to wait for operation (default: 5 seconds)
    ///   - operation: The async operation to perform
    ///   - assertion: Assertion to run on the result
    func testAsyncOperation<T>(
        _ workItem: @escaping () -> AsyncTestResult<T>,
        timeout: TimeInterval = 5.0,
        assertion: @escaping (AsyncTestResult<T>) -> Void
    ) {
        let result = workItem()
        wait(for: [result.expectation], timeout: timeout)
        assertion(result)
    }

    /// Helper to test algorithm handler retrieval
    func getHandlerByAlgorithm(_ algorithmName: String) -> CryptoAlgorithmHandler? {
        return registry.getHandler(for: algorithmName)
    }

    /// Helper to test algorithm handler retrieval by key type
    func getHandlerByKeyType(_ keyType: String) -> CryptoAlgorithmHandler? {
        return registry.getHandlerByKeyType(keyType)
    }

    /// Helper to test algorithm name mapping
    func getAlgorithmName(for keyType: String) -> String? {
        return registry.getAlgorithmName(for: keyType)
    }

    /// Helper to generate a test key and store it
    func generateTestKey() -> String {
        let keyId = UUID().uuidString
        let algorithm: [String: Any] = [
            "name": "RSASSA-PKCS1-v1_5",
            "modulusLength": 2048
        ]
        let key = MockCryptoKey(
            id: keyId,
            algorithm: algorithm,
            keyType: "private",
            keyUsages: ["sign", "verify"],
            extractable: false
        )
        mockKeyStore.store(key, withId: keyId)
        return keyId
    }

    /// Helper to generate a public key for JWK operations
    func generatePublicKeyForJWK() -> String {
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

        // Add test JWK components
        key.keyData = [
            "n": "0vx7agoebGcQSuuPiLJXZptN9nndrQmbXEps2aiAFbWhM78LhWx4cbbfAAtVT86zwu1RK7aPFFxuhDR1L6tSoc_BJECPebWKRXjBZCiFV4n3oknjhMstn64tZ_2W-5JsGY4Hc5n9yBXArwl93lqt7_RN5w6Cf0h4QyQ5v-65YGjQR0_FDW2QvzqY368QQMicAtaSqzs8KJZgnYb9c7d0zgdAZHzu6qMQvRL5hajrn1n91CbOpbISD08qNLyrdkt-bFTWhAI4vMQFh6WeZu0fM4lFd2NcRwr3XPksINHaQ-G_xBniIqbw0Ls1jF44-csFCur-kEgU8awapJzKnqDKgw",
            "e": "AQAB"
        ]

        mockKeyStore.store(key, withId: keyId)
        return keyId
    }

    /// Retrieve a stored test key
    func getStoredKey(withId id: String) -> MockCryptoKey? {
        return mockKeyStore.retrieve(withId: id)
    }

    /// Assert that a handler exists and is of the expected type
    func assertHandler(
        _ handler: CryptoAlgorithmHandler?,
        isType expectedType: CryptoAlgorithmHandler.Type,
        file: StaticString = #file,
        line: UInt = #line
    ) {
        XCTAssertNotNil(handler, file: file, line: line)
        guard let handler = handler else { return }
        XCTAssertTrue(
            type(of: handler) == expectedType,
            "Expected handler type \(expectedType), got \(type(of: handler))",
            file: file,
            line: line
        )
    }

    /// Assert that a key spec is valid for RSA
    func assertRSAKeySpec(
        _ spec: KeyGenSpec?,
        expectedKeySize: Int = 2048,
        file: StaticString = #file,
        line: UInt = #line
    ) {
        XCTAssertNotNil(spec, file: file, line: line)
        guard let spec = spec else { return }
        XCTAssertEqual(
            spec.keyType as String,
            kSecAttrKeyTypeRSA as String,
            file: file,
            line: line
        )
        XCTAssertEqual(spec.keySize, expectedKeySize, file: file, line: line)
    }

    /// Assert that a JWK dictionary has required RSA fields
    func assertValidRSAJWK(
        _ jwk: [String: Any]?,
        file: StaticString = #file,
        line: UInt = #line
    ) {
        XCTAssertNotNil(jwk, file: file, line: line)
        guard let jwk = jwk else { return }

        XCTAssertEqual(
            jwk["kty"] as? String,
            "RSA",
            "JWK should have kty=RSA",
            file: file,
            line: line
        )
        XCTAssertEqual(
            jwk["alg"] as? String,
            "RS256",
            "JWK should have alg=RS256",
            file: file,
            line: line
        )
        XCTAssertNotNil(
            jwk["n"] as? String,
            "JWK should have modulus (n)",
            file: file,
            line: line
        )
        XCTAssertNotNil(
            jwk["e"] as? String,
            "JWK should have exponent (e)",
            file: file,
            line: line
        )
    }
}
