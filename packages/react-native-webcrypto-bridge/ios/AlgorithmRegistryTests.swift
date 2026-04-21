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
}
