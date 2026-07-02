import XCTest

/// Page Object for the Token Details tab
class TokenScreenPageObject {
    let app: XCUIApplication
    
    init(app: XCUIApplication) {
        self.app = app
    }
    
    // MARK: - Elements
    
    var tokenTabButton: XCUIElement {
        return app.buttons["tokenTab"]
    }
    
    var revokeTokenButton: XCUIElement {
        return app.buttons["revokeTokenButton"]
    }
    
    var tokenDetailsView: XCUIElement {
        return app.staticTexts.element(containingText: "Token Details")
    }
    
    var tokenExpirationText: XCUIElement {
        return app.staticTexts.element(containingText: "expiresAt")
    }
    
    // MARK: - Navigation
    
    /// Navigate to Token tab
    func navigateToTab() {
        XCTAssertTrue(
            tokenTabButton.exists,
            "Token tab button should exist"
        )
        tokenTabButton.tapSafely()
        
        // Wait for tab to load
        Thread.sleep(forTimeInterval: 0.5)
        
        // Verify tab title appears
        let tabTitle = app.staticTexts["Token Details"]
        XCTAssertTrue(
            tabTitle.waitForExistence(timeout: 3),
            "Token Details tab should load"
        )
    }
    
    // MARK: - State Verification
    
    /// Check if token details are displayed
    /// - returns: True if token information is visible, false otherwise
    func isTokenDisplayed() -> Bool {
        return tokenDetailsView.exists && tokenDetailsView.isDisplayed
    }
    
    /// Wait for token to be displayed
    /// - parameter timeout: Maximum time to wait in seconds
    /// - returns: True if token appears, false on timeout
    func waitForTokenDisplay(timeout: TimeInterval = 3) -> Bool {
        return XCTestWait.waitFor(timeout: timeout) {
            return self.isTokenDisplayed()
        }
    }
    
    /// Check if revoke button is accessible (visible and hittable)
    /// - returns: True if button is accessible, false otherwise
    func isRevokeButtonAccessible() -> Bool {
        return revokeTokenButton.exists && revokeTokenButton.isHittable
    }
    
    /// Scroll to revoke button if needed
    /// The button may be off-screen, requiring scroll
    func scrollToRevokeButton() {
        var attempts = 0
        let maxAttempts = 5
        
        while !isRevokeButtonAccessible() && attempts < maxAttempts {
            app.swipeUp()
            Thread.sleep(forTimeInterval: 0.2)
            attempts += 1
        }
        
        XCTAssertTrue(
            isRevokeButtonAccessible(),
            "Revoke Token button should be accessible after scrolling"
        )
    }
    
    // MARK: - Actions
    
    /// Tap "Revoke Token" button
    /// Note: Automatically scrolls if button is off-screen
    func tapRevokeToken() {
        // Ensure button is visible and accessible
        scrollToRevokeButton()
        
        revokeTokenButton.tapSafely()
        
        // Wait for revocation to complete
        Thread.sleep(forTimeInterval: 1.5)
    }
    
    /// Perform token revocation flow
    /// - parameter credentialsPageObject: Used to verify credential count changes
    func performRevocation(credentialsPageObject: CredentialsScreenPageObject) throws {
        // Get current credential count before revocation
        let countBefore = credentialsPageObject.getCredentialCount() ?? 0
        
        // Revoke the token
        tapRevokeToken()
        
        // Navigate to Credentials tab to verify count decreased
        credentialsPageObject.navigateToTab()
        
        let expectedCount = max(0, countBefore - 1)
        let countDecreased = credentialsPageObject.waitForCredentialCount(
            expected: expectedCount,
            timeout: 5
        )
        
        XCTAssertTrue(
            countDecreased,
            "Credential count should decrease from \(countBefore) to \(expectedCount)"
        )
    }
}
