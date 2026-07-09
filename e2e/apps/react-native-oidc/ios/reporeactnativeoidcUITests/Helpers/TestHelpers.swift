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
        print("🔑 [TestHelpers] Starting credential load...")
        
        var username: String?
        var password: String?
        
        // First, try to read from testenv file (mirrors Android build.gradle approach)
        do {
            if let testenvCredentials = try? loadCredentialsFromTestenv() {
                print("✅ [TestHelpers] Successfully loaded from testenv file")
                return testenvCredentials
            }
        } catch {
            print("⚠️ [TestHelpers] testenv load failed: \(error)")
        }
        
        // Fallback to environment variables
        print("🔍 [TestHelpers] Checking environment variables...")
        username = ProcessInfo.processInfo.environment["USERNAME"]
        password = ProcessInfo.processInfo.environment["PASSWORD"]
        
        print("  USERNAME from env: \(username?.isEmpty == false ? "***" : "(not set)")")
        print("  PASSWORD from env: \(password?.isEmpty == false ? "***" : "(not set)")")
        
        guard let username = username, !username.isEmpty else {
            throw NSError(domain: "TestHelpers", code: 1,
                userInfo: [NSLocalizedDescriptionKey: "USERNAME not found in testenv file or environment variable"])
        }
        guard let password = password, !password.isEmpty else {
            throw NSError(domain: "TestHelpers", code: 2,
                userInfo: [NSLocalizedDescriptionKey: "PASSWORD not found in testenv file or environment variable"])
        }
        
        print("✅ [TestHelpers] Loaded from environment variables")
        return (username, password)
    }
    
    /// Load credentials from testenv file
    /// Searches for testenv file in known workspace locations
    /// - returns: Tuple of (username, password) if found
    /// - throws: Error if file not found or credentials missing
    private static func loadCredentialsFromTestenv() throws -> (username: String, password: String) {
        let fileManager = FileManager.default
        
        // Try common monorepo root locations
        let commonPaths = [
            // CI environment variable (can be set by build system)
            ProcessInfo.processInfo.environment["TESTENV_PATH"],
            // Typical local dev setup - absolute path
            "/Users/jaredperreault/Code/devex/client-js/testenv",
            // Try from current working directory
            (FileManager.default.currentDirectoryPath as NSString).appendingPathComponent("testenv"),
        ].compactMap { $0 }
        
        print("🔍 [TestHelpers] Searching for testenv in \(commonPaths.count) locations...")
        
        for path in commonPaths {
            print("🔍 [TestHelpers] Checking: \(path)")
            if fileManager.fileExists(atPath: path) {
                print("✅ [TestHelpers] Found testenv at: \(path)")
                return try parseTestenvFile(at: path)
            }
        }
        
        print("❌ [TestHelpers] testenv file not found in any location")
        throw NSError(domain: "TestEnv", code: 1, 
            userInfo: [NSLocalizedDescriptionKey: "testenv file not found"])
    }
    
    /// Parse testenv file and extract USERNAME and PASSWORD
    /// - parameter path: Path to testenv file
    /// - returns: Tuple of (username, password)
    /// - throws: Error if credentials not found
    private static func parseTestenvFile(at path: String) throws -> (username: String, password: String) {
        let content = try String(contentsOfFile: path, encoding: .utf8)
        print("📄 [TestHelpers] testenv file content:\n\(content)")
        
        var username: String?
        var password: String?
        
        let lines = content.components(separatedBy: .newlines)
        print("📄 [TestHelpers] Parsing \(lines.count) lines from testenv")
        
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
            
            print("  → \(key) = \(value.isEmpty ? "(empty)" : "***")")
            
            if key == "USERNAME" {
                username = value
            } else if key == "PASSWORD" {
                password = value
            }
        }
        
        guard let username = username, !username.isEmpty else {
            print("❌ [TestHelpers] USERNAME not found or empty in testenv")
            throw NSError(domain: "TestEnv", code: 2,
                userInfo: [NSLocalizedDescriptionKey: "USERNAME not found in testenv file"])
        }
        guard let password = password, !password.isEmpty else {
            print("❌ [TestHelpers] PASSWORD not found or empty in testenv")
            throw NSError(domain: "TestEnv", code: 3,
                userInfo: [NSLocalizedDescriptionKey: "PASSWORD not found in testenv file"])
        }
        
        print("✅ [TestHelpers] Loaded credentials from testenv file")
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
        print("   ⏳ Checking authentication status...")
        try verifyAuthenticationStatus(expected: false)
        print("   ✅ Auth status verified")
        
        print("   ⏳ Checking credentials count...")
        try verifyCredentialsCount(expected: 0)
        print("   ✅ Credentials count verified")
    }
    
    /// Verify authentication status: either "✅ Authenticated" or "❌ Not Authenticated"
    /// - parameter expected: true for authenticated, false for not authenticated
    func verifyAuthenticationStatus(expected: Bool) throws {
        let expectedText = expected ? "✅ Authenticated" : "❌ Not Authenticated"
        let statusElement = app.staticTexts.element(containingText: expectedText)
        
        print("      → Looking for auth status: '\(expectedText)'...")
        print("      → Element exists: \(statusElement.exists)")
        
        XCTestWait.waitForElement(
            statusElement,
            timeout: 5,
            message: "Should show \(expectedText)"
        )
        XCTAssertTrue(
            statusElement.exists,
            "Expected authentication status: \(expectedText)"
        )
        print("      ✅ Auth status correct: '\(expectedText)'")
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
        
        print("      → Navigating to Credentials tab...")
        // Navigate to Credentials tab first
        try navigateToTab(name: "Creds")
        print("      ✅ On Credentials tab")
        
        print("      → Waiting for: '\(countText)'...")
        XCTestWait.waitForElement(
            countElement,
            timeout: 5,
            message: "Should show \(countText)"
        )
        XCTAssertTrue(
            countElement.exists,
            "Expected to see: \(countText)"
        )
        print("      ✅ Found: '\(countText)'")
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
        
        print("        [navigating to '\(name)' tab]")
        let tabButton = app.buttons[config.contentDesc]
        print("        → Tab button exists: \(tabButton.exists)")
        XCTAssertTrue(
            tabButton.exists,
            "Tab button for \(name) should exist"
        )
        
        print("        → Tapping tab...")
        tabButton.tapSafely()
        Thread.sleep(forTimeInterval: 0.3)
        
        print("        → Waiting for tab title '\(config.title)'...")
        // Wait for tab content to load
        let titleElement = app.staticTexts.element(containingText: config.title)
        XCTestWait.waitForElement(
            titleElement,
            timeout: 3,
            message: "Should navigate to \(name) tab"
        )
        print("        ✅ Tab '\(name)' loaded")
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
