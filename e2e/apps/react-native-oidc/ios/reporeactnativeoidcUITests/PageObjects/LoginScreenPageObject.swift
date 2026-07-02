import XCTest

/// Page Object for the Login/Authentication tab
class LoginScreenPageObject {
    let app: XCUIApplication
    
    init(app: XCUIApplication) {
        self.app = app
    }
    
    // MARK: - Elements
    
    var authStatusElement: XCUIElement {
        return app.staticTexts.element(containingText: "Authenticated")
    }
    
    var requestTokenButton: XCUIElement {
        return app.buttons["requestTokenButton"]
    }
    
    var signOutButton: XCUIElement {
        return app.buttons["signOutButton"]
    }
    
    var clearButton: XCUIElement {
        return app.buttons["clearButton"]
    }
    
    var loginTabButton: XCUIElement {
        return app.buttons["loginTab"]
    }
    
    // MARK: - State Verification
    
    /// Verify current authentication status
    /// - parameter expected: true for authenticated, false for not authenticated
    func verifyAuthStatus(expected: Bool) -> Bool {
        let expectedText = expected ? "✅ Authenticated" : "❌ Not Authenticated"
        let element = app.staticTexts.element(containingText: expectedText)
        return element.exists && element.isDisplayed
    }
    
    /// Wait for authentication status to match expected value
    /// - parameter expected: true for authenticated, false for not authenticated
    /// - parameter timeout: Maximum time to wait in seconds
    /// - returns: True if status matches, false on timeout
    func waitForAuthStatus(expected: Bool, timeout: TimeInterval = 5) -> Bool {
        return XCTestWait.waitFor(timeout: timeout) {
            return self.verifyAuthStatus(expected: expected)
        }
    }
    
    // MARK: - Actions
    
    /// Tap "Request Token" button to initiate OAuth flow
    func tapRequestToken() {
        XCTAssertTrue(
            requestTokenButton.exists,
            "Request Token button should exist"
        )
        requestTokenButton.tapSafely()
    }
    
    /// Tap "Sign Out" button to revoke token and logout
    func tapSignOut() {
        XCTAssertTrue(
            signOutButton.exists,
            "Sign Out button should exist"
        )
        signOutButton.tapSafely()
    }
    
    /// Tap "Clear" button to clear stored credentials
    func tapClear() {
        XCTAssertTrue(
            clearButton.exists,
            "Clear button should exist"
        )
        clearButton.tapSafely()
    }
    
    /// Ensure we're on the Login tab
    func navigateToTab() {
        XCTAssertTrue(
            loginTabButton.exists,
            "Login tab button should exist"
        )
        if !loginTabButton.isDisplayed {
            loginTabButton.tap()
            Thread.sleep(forTimeInterval: 0.3)
        }
    }
    
    /// Perform complete login flow from request to completion
    /// - parameter oauthHelper: Helper for OAuth interaction
    /// - parameter credentials: (username, password) tuple
    func performLogin(
        oauthHelper: OAuthHelper,
        credentials: (username: String, password: String)
    ) throws {
        // Start OAuth flow
        tapRequestToken()
        
        // Wait for OAuth UI to appear
        let oAuthUIAppeared = oauthHelper.waitForOAuthUI(timeout: 8)
        XCTAssertTrue(oAuthUIAppeared, "OAuth UI should appear")
        
        // Enter credentials and authorize
        try oauthHelper.enterOAuthCredentials(
            username: credentials.username,
            password: credentials.password
        )
        
        // Wait for OAuth to complete and app to return
        try oauthHelper.waitForOAuthCompletion(timeout: 10)
        
        // Verify authenticated state
        try oauthHelper.waitForAuthenticatedState(timeout: 5)
        
        XCTAssertTrue(
            verifyAuthStatus(expected: true),
            "Should show authenticated status after successful login"
        )
    }
    
    /// Perform logout by tapping Sign Out
    func performLogout() throws {
        tapSignOut()
        
        // Wait for state to update
        Thread.sleep(forTimeInterval: 2)
        
        XCTAssertTrue(
            verifyAuthStatus(expected: false),
            "Should show not authenticated status after logout"
        )
    }
    
    /// Clear app state
    func performClear() throws {
        tapClear()
        
        // Wait for clear to complete
        Thread.sleep(forTimeInterval: 2)
        
        XCTAssertTrue(
            verifyAuthStatus(expected: false),
            "Should show not authenticated status after clear"
        )
    }
}
