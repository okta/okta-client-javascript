import XCTest

/// Page Object for the Credentials tab
class CredentialsScreenPageObject {
    let app: XCUIApplication
    
    init(app: XCUIApplication) {
        self.app = app
    }
    
    // MARK: - Elements

    var credentialCountText: XCUIElement {
        // Looks for text like "2 credentials stored" or "No credentials found"
        let stored = app.staticTexts.containing(NSPredicate(format: "label CONTAINS 'stored'")).firstMatch
        let notFound = app.staticTexts.containing(NSPredicate(format: "label CONTAINS 'No credentials'")).firstMatch
        return stored.exists ? stored : notFound
    }
    
    var defaultBadge: XCUIElement {
        return app.staticTexts.element(containingText: "DEFAULT")
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
        return defaultBadge.exists
    }
}
