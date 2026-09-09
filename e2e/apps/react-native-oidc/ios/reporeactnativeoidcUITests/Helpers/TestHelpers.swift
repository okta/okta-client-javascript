import XCTest

/// Shared test utilities for React Native OIDC e2e tests
class TestHelpers {
    let app: XCUIApplication
    
    init(app: XCUIApplication) {
        self.app = app
    }
    
    // MARK: - Setup & Teardown
    
    /// Load OAuth credentials from testenv file or environment variables
    /// Reads from testenv file (like Android build.gradle) if it exists, otherwise falls back to env vars
    /// - returns: Tuple of (username, password)
    /// - throws: XCTestError if credentials not found
    static func loadOAuthCredentials() throws -> (username: String, password: String) {
        var username: String?
        var password: String?
        
        // FUTURE: load from testenv file (and remove nil-coalesced defaults)
        username = ProcessInfo.processInfo.environment["USERNAME"] ?? "foo"
        password = ProcessInfo.processInfo.environment["PASSWORD"] ?? "bar"

        guard let username = username, !username.isEmpty else {
            throw NSError(domain: "TestHelpers", code: 1,
                userInfo: [NSLocalizedDescriptionKey: "USERNAME not found in testenv file or environment variable"])
        }
        guard let password = password, !password.isEmpty else {
            throw NSError(domain: "TestHelpers", code: 2,
                userInfo: [NSLocalizedDescriptionKey: "PASSWORD not found in testenv file or environment variable"])
        }

        return (username, password)
    }

    // MARK: - App State Assertions

    /// Verify fresh app state (not authenticated, no credentials)
    func assertFreshAppState() throws {
        try verifyAuthenticationStatus(expected: false)
        try verifyCredentialsCount(expected: 0)
    }
    
    /// Verify authentication status: either "✅ Authenticated" or "❌ Not Authenticated"
    /// - parameter expected: true for authenticated, false for not authenticated
    func verifyAuthenticationStatus(expected: Bool) throws {
        let expectedText = expected ? "✅ Authenticated" : "❌ Not Authenticated"
        let statusElement = app.staticTexts.element(containingText: expectedText)
        
        XCTestWait.waitForElement(
            statusElement,
            timeout: 5,
            message: "Should show \(expectedText)"
        )
        XCTAssertTrue(
            statusElement.exists,
            "Expected authentication status: \(expectedText)"
        )
    }
    
    /// Verify number of stored credentials
    /// - parameter expected: Expected credential count
    func verifyCredentialsCount(expected: Int) throws {
        let countText: String
        if expected == 0 {
            countText = "No credentials found"
        } else {
            countText = "\(expected) credential\(expected == 1 ? "" : "s") stored"
        }
        let countElement = app.staticTexts.element(containingText: countText)
        
        // Navigate to Credentials tab first
        try navigateToTab(name: "Creds")
        
        XCTestWait.waitForElement(
            countElement,
            timeout: 5,
            message: "Should show \(countText)"
        )
        XCTAssertTrue(
            countElement.exists,
            "Expected to see: \(countText)"
        )
    }
    
    // MARK: - App Navigation
    
    /// Navigate to a specific tab in the app
    /// - parameter name: Tab name ("Login", "Creds", or "Token")
    func navigateToTab(name: String) throws {
        let tabConfigs: [String: (contentDesc: String, title: String)] = [
            "Login": (contentDesc: "loginTab", title: "Authentication"),
            "Creds": (contentDesc: "credentialsTab", title: "Credentials"),
            "Token": (contentDesc: "tokenTab", title: "Token Details")
        ]
        
        guard let config = tabConfigs[name] else {
            throw NSError(domain: "TestHelpers", code: 3,
                userInfo: [NSLocalizedDescriptionKey: "Unknown tab: \(name)"])
        }
        

        let tabButton = app.buttons[config.contentDesc]
        XCTAssertTrue(
            tabButton.exists,
            "Tab button for \(name) should exist"
        )

        tabButton.tapSafely()
        Thread.sleep(forTimeInterval: 0.3)
        
        // Wait for tab content to load
        let titleElement = app.staticTexts.element(containingText: config.title)
        XCTestWait.waitForElement(
            titleElement,
            timeout: 3,
            message: "Should navigate to \(name) tab"
        )
    }
    
    // MARK: - Action Helpers
    
    /// Tap the "Request Token" button to start OAuth flow
    func tapRequestToken() throws {
        let button = app.buttons["requestTokenButton"]
        XCTAssertTrue(button.exists, "Request Token button should exist")
        button.tapSafely()
    }
    
    /// Tap the "Sign Out" button
    func tapSignOut() throws {
        let button = app.buttons["signOutButton"]
        XCTAssertTrue(button.exists, "Sign Out button should exist")
        button.tapSafely()
    }
    
    /// Tap the "Clear" button
    func tapClear() throws {
        let button = app.buttons["clearButton"]
        XCTAssertTrue(button.exists, "Clear button should exist")
        button.tapSafely()
    }
}
