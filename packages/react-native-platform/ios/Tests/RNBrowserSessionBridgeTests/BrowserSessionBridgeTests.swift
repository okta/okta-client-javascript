import XCTest
@testable import RNBrowserSessionBridge

class BrowserSessionBridgeTests: XCTestCase {

    var sut: BrowserSessionBridge!

    override func setUp() {
        super.setUp()
        sut = BrowserSessionBridge()
    }

    override func tearDown() {
        super.tearDown()
        sut = nil
    }

    // MARK: - Initialization Tests

    func testInit_shouldSucceed() {
        XCTAssertNotNil(sut)
    }

    func testRequiresMainQueueSetup_shouldReturnValue() {
        XCTAssertFalse(BrowserSessionBridge.requiresMainQueueSetup())
    }

    func testModuleName_shouldReturnBrowserSessionBridge() {
        XCTAssertEqual(BrowserSessionBridge.moduleName(), "BrowserSessionBridge")
    }

    func testConstantsToExport_shouldBeNotNil() {
        let constants = sut.constantsToExport()
        XCTAssertNotNil(constants)
    }

    #if os(iOS)
    // MARK: - Launch Browser Session Tests (iOS only)

    func testLaunchBrowserSession_withValidUrl_shouldResolve() {
        let expectation = XCTestExpectation(description: "Launch browser session")

        sut.launchBrowserSession("https://example.com") { result in
            XCTAssertNil(result)
            expectation.fulfill()
        } reject: { code, message, error in
            XCTFail("Should not reject: \(message ?? "unknown error")")
            expectation.fulfill()
        }

        wait(for: [expectation], timeout: 2.0)
    }

    func testLaunchBrowserSession_withInvalidUrl_shouldReject() {
        let expectation = XCTestExpectation(description: "Launch with invalid URL")

        sut.launchBrowserSession("not a url") { result in
            XCTFail("Should not resolve")
            expectation.fulfill()
        } reject: { code, message, error in
            XCTAssertEqual(code, "invalid_url")
            expectation.fulfill()
        }

        wait(for: [expectation], timeout: 2.0)
    }

    // MARK: - Close Browser Session Tests (iOS only)

    func testCloseBrowserSession_shouldResolve() {
        let expectation = XCTestExpectation(description: "Close browser session")

        sut.closeBrowserSession { result in
            XCTAssertNil(result)
            expectation.fulfill()
        } reject: { code, message, error in
            XCTFail("Should resolve")
            expectation.fulfill()
        }

        wait(for: [expectation], timeout: 2.0)
    }

    // MARK: - Integration Tests (iOS only)

    func testLaunchAndCloseBrowserSession() {
        let launchExpectation = XCTestExpectation(description: "Launch")
        let closeExpectation = XCTestExpectation(description: "Close")

        sut.launchBrowserSession("https://example.com") { _ in
            launchExpectation.fulfill()
        } reject: { _, _, _ in
            XCTFail("Launch should not reject")
            launchExpectation.fulfill()
        }

        wait(for: [launchExpectation], timeout: 2.0)

        sut.closeBrowserSession { _ in
            closeExpectation.fulfill()
        } reject: { _, _, _ in
            XCTFail("Close should not reject")
            closeExpectation.fulfill()
        }

        wait(for: [closeExpectation], timeout: 2.0)
    }
    #endif
}

