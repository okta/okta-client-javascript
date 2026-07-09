import XCTest

/// Page Object for the Credentials tab
class CredentialsScreenPageObject {
    let app: XCUIApplication
    
    init(app: XCUIApplication) {
        self.app = app
    }
    
    // MARK: - Elements
    
    var credentialsTabButton: XCUIElement {
        return app.buttons["credentialsTab"]
    }
    
    var credentialCountText: XCUIElement {
        // Looks for text like "2 credentials stored" or "No credentials found"
        let stored = app.staticTexts.element(containingText: "stored")
        let notFound = app.staticTexts.element(containingText: "No credentials")
        return stored.exists ? stored : notFound
    }
    
    var defaultBadge: XCUIElement {
        return app.staticTexts["DEFAULT"]
    }
    
    var credentialsTableView: XCUIElement {
        return app.tables.element
    }
    
    // MARK: - State Verification
    
    /// Get the current credential count from displayed text
    /// - returns: Integer count of credentials, or nil if not readable
    func getCredentialCount() -> Int? {
        let countElement = credentialCountText
        if !countElement.exists {
            return nil
        }
        
        let text = countElement.label
        
        // Check for "No credentials found" first
        if text.contains("No credentials") {
            return 0
        }
        
        // Extract number from text like "2 credentials stored"
        let components = text.components(separatedBy: " ")
        if let firstComponent = components.first, let count = Int(firstComponent) {
            return count
        }
        return nil
    }
    
    /// Verify credential count matches expected value
    /// - parameter expected: Expected number of credentials
    /// - returns: True if count matches, false otherwise
    func verifyCredentialCount(expected: Int) -> Bool {
        guard let count = getCredentialCount() else {
            return false
        }
        return count == expected
    }
    
    /// Wait for credential count to match expected value
    /// - parameter expected: Expected number of credentials
    /// - parameter timeout: Maximum time to wait in seconds
    /// - returns: True if count matches within timeout, false otherwise
    func waitForCredentialCount(expected: Int, timeout: TimeInterval = 5) -> Bool {
        return XCTestWait.waitFor(timeout: timeout) {
            return self.verifyCredentialCount(expected: expected)
        }
    }
    
    /// Check if DEFAULT badge is visible
    /// - returns: True if DEFAULT badge exists and is displayed, false otherwise
    func isDefaultBadgeVisible() -> Bool {
        return defaultBadge.exists && defaultBadge.isDisplayed
    }
    
    /// Wait for DEFAULT badge to become visible
    /// - parameter timeout: Maximum time to wait in seconds
    /// - returns: True if badge becomes visible, false on timeout
    func waitForDefaultBadge(timeout: TimeInterval = 3) -> Bool {
        return XCTestWait.waitFor(timeout: timeout) {
            return self.isDefaultBadgeVisible()
        }
    }
    
    /// Wait for DEFAULT badge to disappear
    /// - parameter timeout: Maximum time to wait in seconds
    /// - returns: True if badge disappears, false on timeout
    func waitForDefaultBadgeToDisappear(timeout: TimeInterval = 3) -> Bool {
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if !isDefaultBadgeVisible() {
                return true
            }
            Thread.sleep(forTimeInterval: 0.1)
        }
        return !isDefaultBadgeVisible()
    }
}
