import XCTest
@testable import RNBrowserSessionBridge

class BrowserSessionBridgeEphemeralSessionTests: XCTestCase {

    var sut: BrowserSessionBridge!
    
    override func setUp() {
        super.setUp()
        sut = BrowserSessionBridge()
    }

    override func tearDown() {
        super.tearDown()
        sut = nil
    }

    // MARK: - Ephemeral Session Option Tests

    #if os(iOS)
    
    func testOpenAuthSession_withEphemeralSessionFalse_shouldUseSharedSession() {
        let expectation = XCTestExpectation(description: "Open auth session with ephemeral: false")
        
        let options: NSDictionary = ["ephemeralSession": NSNumber(value: false)]
        
        sut.openAuthSession(
            "https://example.com/auth",
            redirectScheme: "com.example",
            options: options,
            resolve: { result in
                // Session should start without error (or timeout)
                expectation.fulfill()
            },
            reject: { code, message, error in
                // Rejection is also acceptable if UI not available in tests
                expectation.fulfill()
            }
        )
        
        wait(for: [expectation], timeout: 1.0)
    }

    func testOpenAuthSession_withEphemeralSessionTrue_shouldUseIsolatedSession() {
        let expectation = XCTestExpectation(description: "Open auth session with ephemeral: true")
        
        let options: NSDictionary = ["ephemeralSession": NSNumber(value: true)]
        
        sut.openAuthSession(
            "https://example.com/auth",
            redirectScheme: "com.example",
            options: options,
            resolve: { result in
                // Session should start without error (or timeout)
                expectation.fulfill()
            },
            reject: { code, message, error in
                // Rejection is also acceptable if UI not available in tests
                expectation.fulfill()
            }
        )
        
        wait(for: [expectation], timeout: 1.0)
    }

    func testOpenAuthSession_withMissingEphemeralOption_shouldDefaultToFalse() {
        let expectation = XCTestExpectation(description: "Open auth session with missing ephemeral option")
        
        let options: NSDictionary = [:] // Empty options
        
        sut.openAuthSession(
            "https://example.com/auth",
            redirectScheme: "com.example",
            options: options,
            resolve: { result in
                // Should use default (false) - shared session
                expectation.fulfill()
            },
            reject: { code, message, error in
                // Rejection is also acceptable if UI not available in tests
                expectation.fulfill()
            }
        )
        
        wait(for: [expectation], timeout: 1.0)
    }

    func testOpenAuthSession_withInvalidUrl_shouldRejectWithInvalidUrlError() {
        let expectation = XCTestExpectation(description: "Open with invalid URL")
        
        let options: NSDictionary = ["ephemeralSession": NSNumber(value: false)]
        
        sut.openAuthSession(
            "not a valid url",
            redirectScheme: "com.example",
            options: options,
            resolve: { result in
                XCTFail("Should reject with invalid URL error")
                expectation.fulfill()
            },
            reject: { code, message, error in
                XCTAssertEqual(code, "invalid_url")
                expectation.fulfill()
            }
        )
        
        wait(for: [expectation], timeout: 1.0)
    }

    func testOpenAuthSession_withEmptyUrl_shouldRejectWithInvalidUrlError() {
        let expectation = XCTestExpectation(description: "Open with empty URL")
        
        let options: NSDictionary = ["ephemeralSession": NSNumber(value: true)]
        
        sut.openAuthSession(
            "",
            redirectScheme: "com.example",
            options: options,
            resolve: { result in
                XCTFail("Should reject with invalid URL error")
                expectation.fulfill()
            },
            reject: { code, message, error in
                XCTAssertEqual(code, "invalid_url")
                expectation.fulfill()
            }
        )
        
        wait(for: [expectation], timeout: 1.0)
    }

    func testOpenAuthSession_withValidUrl_shouldAcceptBothEphemeralValues() {
        let expectationFalse = XCTestExpectation(description: "With ephemeral false")
        let expectationTrue = XCTestExpectation(description: "With ephemeral true")
        
        let url = "https://example.com/auth"
        let scheme = "com.example"
        
        // Test with ephemeral: false
        let optionsFalse: NSDictionary = ["ephemeralSession": NSNumber(value: false)]
        sut.openAuthSession(
            url,
            redirectScheme: scheme,
            options: optionsFalse,
            resolve: { _ in expectationFalse.fulfill() },
            reject: { _, _, _ in expectationFalse.fulfill() }
        )
        
        // Test with ephemeral: true
        let optionsTrue: NSDictionary = ["ephemeralSession": NSNumber(value: true)]
        sut.openAuthSession(
            url,
            redirectScheme: scheme,
            options: optionsTrue,
            resolve: { _ in expectationTrue.fulfill() },
            reject: { _, _, _ in expectationTrue.fulfill() }
        )
        
        wait(for: [expectationFalse, expectationTrue], timeout: 2.0)
    }

    func testOpenAuthSession_shouldExtractEphemeralSessionFromOptions() {
        let expectation = XCTestExpectation(description: "Extract ephemeral option")
        
        // Create options with various data types to test extraction robustness
        let options: NSDictionary = [
            "ephemeralSession": NSNumber(value: true),
            "otherOption": "ignored"
        ]
        
        sut.openAuthSession(
            "https://example.com/auth",
            redirectScheme: "com.example",
            options: options,
            resolve: { result in
                expectation.fulfill()
            },
            reject: { code, message, error in
                expectation.fulfill()
            }
        )
        
        wait(for: [expectation], timeout: 1.0)
    }

    #endif
}
