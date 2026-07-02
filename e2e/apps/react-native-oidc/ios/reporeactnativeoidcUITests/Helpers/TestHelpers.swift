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
        
        // First, try to read from testenv file (mirrors Android build.gradle approach)
        if let testenvCredentials = try? loadCredentialsFromTestenv() {
            return testenvCredentials
        }
        
        // Fallback to environment variables
        username = ProcessInfo.processInfo.environment["USERNAME"]
        password = ProcessInfo.processInfo.environment["PASSWORD"]
        
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
    
    /// Load credentials from testenv file
    /// Searches for testenv file at workspace root and parses USERNAME and PASSWORD
    /// - returns: Tuple of (username, password) if found
    /// - throws: Error if file not found or credentials missing
    private static func loadCredentialsFromTestenv() throws -> (username: String, password: String) {
        // Find testenv file relative to this source file location
        // Source is at: e2e/apps/react-native-oidc/ios/E2e/Helpers/TestHelpers.swift
        // Need to go up to workspace root
        let sourcePath = #filePath // Current file path
        let fileManager = FileManager.default
        
        // Walk up the directory tree to find testenv
        var currentPath = (sourcePath as NSString).deletingLastPathComponent
        var attempts = 0
        let maxAttempts = 10 // Prevent infinite loops
        
        while attempts < maxAttempts {
            let potentialTestenvPath = (currentPath as NSString).appendingPathComponent("testenv")
            
            if fileManager.fileExists(atPath: potentialTestenvPath) {
                return try parseTestenvFile(at: potentialTestenvPath)
            }
            
            let parentPath = (currentPath as NSString).deletingLastPathComponent
            if parentPath == currentPath {
                // Reached root directory
                break
            }
            
            currentPath = parentPath
            attempts += 1
        }
        
        throw NSError(domain: "TestEnv", code: 1, 
            userInfo: [NSLocalizedDescriptionKey: "testenv file not found"])
    }
    
    /// Parse testenv file and extract USERNAME and PASSWORD
    /// - parameter path: Path to testenv file
    /// - returns: Tuple of (username, password)
    /// - throws: Error if credentials not found
    private static func parseTestenvFile(at path: String) throws -> (username: String, password: String) {
        let content = try String(contentsOfFile: path, encoding: .utf8)
        var username: String?
        var password: String?
        
        let lines = content.components(separatedBy: .newlines)
        
        for line in lines {
            let trimmed = line.trimmingCharacters(in: .whitespaces)
            
            // Skip empty lines and comments
            if trimmed.isEmpty || trimmed.starts(with: "#") {
                continue
            }
            
            // Parse KEY=VALUE format
            let components = trimmed.components(separatedBy: "=")
            guard components.count == 2 else { continue }
            
            let key = components[0].trimmingCharacters(in: .whitespaces)
            var value = components[1].trimmingCharacters(in: .whitespaces)
            
            // Remove surrounding quotes if present
            if value.starts(with: "\"") && value.hasSuffix("\"") {
                value = String(value.dropFirst().dropLast())
            }
            
            if key == "USERNAME" {
                username = value
            } else if key == "PASSWORD" {
                password = value
            }
        }
        
        guard let username = username, !username.isEmpty else {
            throw NSError(domain: "TestEnv", code: 2,
                userInfo: [NSLocalizedDescriptionKey: "USERNAME not found in testenv file"])
        }
        guard let password = password, !password.isEmpty else {
            throw NSError(domain: "TestEnv", code: 3,
                userInfo: [NSLocalizedDescriptionKey: "PASSWORD not found in testenv file"])
        }
        
        print("📋 Loaded credentials from testenv file")
        return (username, password)
    }
    
    // MARK: - App State Assertions
    
    /// Verify app launched successfully
    func verifyAppLaunched(timeout: TimeInterval = 10) throws {
        let authTab = app.buttons["loginTab"]
        let exists = authTab.waitForExistence(timeout: timeout)
        XCTAssertTrue(exists, "App should launch and show authentication tab")
    }
    
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
        let countText = "\(expected) credential\(expected == 1 ? "" : "s") stored"
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
    
    /// Scroll to element if needed (useful for buttons at bottom of screen)
    func scrollToElement(_ element: XCUIElement, swipeCount: Int = 3) {
        for _ in 0..<swipeCount {
            if element.exists && element.isHittable {
                return
            }
            app.swipeUp()
            Thread.sleep(forTimeInterval: 0.2)
        }
    }
    
    /// Scroll up (to top)
    func scrollToTop(swipeCount: Int = 3) {
        for _ in 0..<swipeCount {
            app.swipeDown()
            Thread.sleep(forTimeInterval: 0.2)
        }
    }
}
