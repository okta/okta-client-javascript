import XCTest
@testable import RNWebCryptoBridge

class AlgorithmRegistryTests: XCTestCase {

    func testGetHandler_returnsRegisteredHandler() {
        let handler = AlgorithmRegistry.shared.getHandler(for: "RSASSA-PKCS1-v1_5")
        XCTAssertNotNil(handler)
        XCTAssertTrue(handler is RSAHandler)
    }

    func testGetHandler_returnsNilForUnregisteredAlgorithm() {
        let handler = AlgorithmRegistry.shared.getHandler(for: "NONEXISTENT")
        XCTAssertNil(handler)
    }

    func testGetHandlerByKeyType_RSA_returnsHandler() {
        let handler = AlgorithmRegistry.shared.getHandlerByKeyType("RSA")
        XCTAssertNotNil(handler)
        XCTAssertTrue(handler is RSAHandler)
    }

    func testGetHandlerByKeyType_EC_returnsNil() {
        // EC handler not yet implemented
        let handler = AlgorithmRegistry.shared.getHandlerByKeyType("EC")
        XCTAssertNil(handler)
    }

    func testGetHandlerByKeyType_OKP_returnsNil() {
        // EdDSA handler not yet implemented
        let handler = AlgorithmRegistry.shared.getHandlerByKeyType("OKP")
        XCTAssertNil(handler)
    }

    func testGetHandlerByKeyType_unknownType_returnsNil() {
        let handler = AlgorithmRegistry.shared.getHandlerByKeyType("UNKNOWN")
        XCTAssertNil(handler)
    }

    func testThreadSafety_concurrentAccess() {
        let group = DispatchGroup()
        let iterations = 100

        for _ in 0..<iterations {
            DispatchQueue.global().async(group: group) {
                let handler = AlgorithmRegistry.shared.getHandler(for: "RSASSA-PKCS1-v1_5")
                XCTAssertNotNil(handler)
            }

            DispatchQueue.global().async(group: group) {
                let handler = AlgorithmRegistry.shared.getHandlerByKeyType("RSA")
                XCTAssertNotNil(handler)
            }
        }

        let waitResult = group.wait(timeout: .now() + 10)
        XCTAssertEqual(waitResult, .success)
    }

    func testSingleton_returnsSharedInstance() {
        let instance1 = AlgorithmRegistry.shared
        let instance2 = AlgorithmRegistry.shared

        XCTAssertTrue(instance1 === instance2)
    }

    func testGetAlgorithmName_RSA_returnsRSASSAPKCS1v15() {
        let algorithmName = AlgorithmRegistry.shared.getAlgorithmName(for: "RSA")
        XCTAssertEqual(algorithmName, "RSASSA-PKCS1-v1_5")
    }

    func testGetAlgorithmName_EC_returnsECDSA() {
        let algorithmName = AlgorithmRegistry.shared.getAlgorithmName(for: "EC")
        XCTAssertEqual(algorithmName, "ECDSA")
    }

    func testGetAlgorithmName_OKP_returnsEdDSA() {
        let algorithmName = AlgorithmRegistry.shared.getAlgorithmName(for: "OKP")
        XCTAssertEqual(algorithmName, "EdDSA")
    }

    func testGetAlgorithmName_unknown_returnsNil() {
        let algorithmName = AlgorithmRegistry.shared.getAlgorithmName(for: "UNKNOWN")
        XCTAssertNil(algorithmName)
    }

    func testRegister_customHandler_returnsRegisteredHandler() {
        let customHandler = RSAHandler()  // Use RSAHandler as a test double
        let algorithmName = "CUSTOM-ALGORITHM"

        AlgorithmRegistry.shared.register(customHandler, for: algorithmName)

        let retrieved = AlgorithmRegistry.shared.getHandler(for: algorithmName)
        XCTAssertNotNil(retrieved)
        XCTAssertTrue(retrieved is RSAHandler)
    }

    func testRegister_overwrites_existingHandler() {
        let customHandler = RSAHandler()  // Test double
        let algorithmName = "RSASSA-PKCS1-v1_5"

        // Overwrite with custom handler
        AlgorithmRegistry.shared.register(customHandler, for: algorithmName)
        let retrieved = AlgorithmRegistry.shared.getHandler(for: algorithmName)

        // Verify it's retrievable and is an RSAHandler
        XCTAssertNotNil(retrieved)
        XCTAssertTrue(retrieved is RSAHandler)
    }

    func testConcurrentRegistration_succeeds() {
        let group = DispatchGroup()
        let iterations = 50

        for i in 0..<iterations {
            DispatchQueue.global().async(group: group) {
                let customHandler = RSAHandler()
                let algorithmName = "CONCURRENT-CUSTOM-\(i)"

                AlgorithmRegistry.shared.register(customHandler, for: algorithmName)

                let retrieved = AlgorithmRegistry.shared.getHandler(for: algorithmName)
                XCTAssertNotNil(retrieved)
                XCTAssertTrue(retrieved is RSAHandler)
            }
        }

        let waitResult = group.wait(timeout: .now() + 10)
        XCTAssertEqual(waitResult, .success)
    }

    func testMixedConcurrentOperations_succeeds() {
        let group = DispatchGroup()
        let iterations = 100

        for i in 0..<iterations {
            if i % 3 == 0 {
                // Some threads do handler lookups
                DispatchQueue.global().async(group: group) {
                    let handler = AlgorithmRegistry.shared.getHandler(for: "RSASSA-PKCS1-v1_5")
                    XCTAssertNotNil(handler)
                }
            } else if i % 3 == 1 {
                // Some threads do key type lookups
                DispatchQueue.global().async(group: group) {
                    let algorithmName = AlgorithmRegistry.shared.getAlgorithmName(for: "RSA")
                    XCTAssertEqual(algorithmName, "RSASSA-PKCS1-v1_5")
                }
            } else {
                // Some threads do registrations
                DispatchQueue.global().async(group: group) {
                    let customHandler = RSAHandler()
                    let algorithmName = "MIXED-CONCURRENT-\(i)"

                    AlgorithmRegistry.shared.register(customHandler, for: algorithmName)
                    let retrieved = AlgorithmRegistry.shared.getHandler(for: algorithmName)
                    XCTAssertNotNil(retrieved)
                }
            }
        }

        let waitResult = group.wait(timeout: .now() + 10)
        XCTAssertEqual(waitResult, .success)
    }
}
