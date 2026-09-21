import Foundation
import XCTest

/// Result container for capturing async operation outcomes
class AsyncTestResult<T> {
    var value: T?
    var error: Error?
    var errorCode: String?
    var errorMessage: String?
    var isResolved = false
    var isRejected = false
    let expectation: XCTestExpectation

    init(description: String) {
        self.expectation = XCTestExpectation(description: description)
    }

    /// Capture a successful resolve
    func captureResolve(_ value: Any?) {
        self.value = value as? T
        self.isResolved = true
        self.isRejected = false
        expectation.fulfill()
    }

    /// Capture a rejection with error code and message
    func captureReject(code: String?, message: String?, error: Error?) {
        self.errorCode = code
        self.errorMessage = message
        self.error = error
        self.isRejected = true
        self.isResolved = false
        expectation.fulfill()
    }
}

/// Test utilities for algorithm operations
class IntegrationTestHelpers {

    /// Helper to convert String to JSON dictionary
    static func parseJSON(_ jsonString: String) -> [String: Any]? {
        guard let data = jsonString.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            return nil
        }
        return json
    }

    /// Helper to convert dictionary to JSON string
    static func toJSON(_ dict: [String: Any]) -> String? {
        guard let data = try? JSONSerialization.data(withJSONObject: dict),
              let json = String(data: data, encoding: .utf8) else {
            return nil
        }
        return json
    }

    /// Create RSA algorithm spec JSON
    static func rsaAlgorithm(_ modulusLength: Int = 2048) -> String {
        return """
        {"name":"RSASSA-PKCS1-v1_5","modulusLength":\(modulusLength)}
        """
    }

    /// Create signature algorithm spec JSON
    static func signatureAlgorithm() -> String {
        return """
        {"name":"RSASSA-PKCS1-v1_5"}
        """
    }

    /// Create digest algorithm spec JSON
    static func digestAlgorithm(_ algorithm: String = "SHA-256") -> String {
        return """
        {"name":"\(algorithm)"}
        """
    }

    /// Encode data to base64
    static func toBase64(_ data: Data) -> String {
        return data.base64EncodedString()
    }

    /// Encode string to base64
    static func toBase64(_ string: String) -> String {
        guard let data = string.data(using: .utf8) else { return "" }
        return data.base64EncodedString()
    }

    /// Decode base64 to data
    static func fromBase64(_ base64String: String) -> Data? {
        return Data(base64Encoded: base64String)
    }
}

/// Mock key store for testing
class MockKeyStore {
    static let shared = MockKeyStore()
    private var keys: [String: MockCryptoKey] = [:]

    private init() {}

    func store(_ key: MockCryptoKey, withId id: String) {
        keys[id] = key
    }

    func retrieve(withId id: String) -> MockCryptoKey? {
        return keys[id]
    }

    func clear() {
        keys.removeAll()
    }

    func getAllKeyIds() -> [String] {
        return Array(keys.keys)
    }
}

/// Mock cryptographic key for testing
struct MockCryptoKey {
    let id: String
    let algorithm: [String: Any]
    let keyType: String  // "private" or "public"
    let keyUsages: [String]
    let extractable: Bool
    var keyData: [String: String] = [:]  // For JWK data (n, e, etc.)
}

/// Test data generator
class TestDataGenerator {

    /// Generate random bytes
    static func randomBytes(count: Int) -> Data {
        var bytes = [UInt8](repeating: 0, count: count)
        _ = SecRandomCopyBytes(kSecRandomDefault, count, &bytes)
        return Data(bytes)
    }

    /// Generate a test RSA JWK (public key only)
    static func testRSAPublicJWK() -> String {
        return """
        {
            "kty":"RSA",
            "alg":"RS256",
            "n":"0vx7agoebGcQSuuPiLJXZptN9nndrQmbXEps2aiAFbWhM78LhWx4cbbfAAtVT86zwu1RK7aPFFxuhDR1L6tSoc_BJECPebWKRXjBZCiFV4n3oknjhMstn64tZ_2W-5JsGY4Hc5n9yBXArwl93lqt7_RN5w6Cf0h4QyQ5v-65YGjQR0_FDW2QvzqY368QQMicAtaSqzs8KJZgnYb9c7d0zgdAZHzu6qMQvRL5hajrn1n91CbOpbISD08qNLyrdkt-bFTWhAI4vMQFh6WeZu0fM4lFd2NcRwr3XPksINHaQ-G_xBniIqbw0Ls1jF44-csFCur-kEgU8awapJzKnqDKgw",
            "e":"AQAB"
        }
        """
    }

    /// Generate test data for signing
    static func testDataForSigning() -> String {
        return IntegrationTestHelpers.toBase64("test message for signing")
    }
}
