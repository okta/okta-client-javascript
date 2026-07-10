import XCTest

/**
 Hybrid E2E tests for OAuth authentication flows on iOS.
 
 These tests use XCUITest to interact with the React Native OIDC test app and
 ASWebAuthenticationSession for OAuth provider interaction.
 
 Prerequisites:
 - USERNAME and PASSWORD environment variables must be set (from testenv file)
 - iOS simulator must have networking access to OAuth provider (Okta)
 */
final class ReactNativeOIDCAppUITests: XCTestCase {
    
    // MARK: - Properties
    
    var app: XCUIApplication!
    var testHelpers: TestHelpers!
    var oauthHelper: OAuthHelper!
    var loginScreen: LoginScreenPageObject!
    var credentialsScreen: CredentialsScreenPageObject!
    var tokenScreen: TokenScreenPageObject!
    
    var oauthCredentials: (username: String, password: String)!
    
    // MARK: - Setup & Teardown
    
    override func setUpWithError() throws {
        print("\n" + String(repeating: "=", count: 60))
        print("🧪 setUp START")
        print(String(repeating: "=", count: 60))
        
        // Disable automatic screenshot capture to speed up tests
        continueAfterFailure = false
        
        print("📱 Initializing app...")
        // Initialize app
        app = XCUIApplication()
        testHelpers = TestHelpers(app: app)
        oauthHelper = OAuthHelper(app: app)
        loginScreen = LoginScreenPageObject(app: app)
        credentialsScreen = CredentialsScreenPageObject(app: app)
        tokenScreen = TokenScreenPageObject(app: app)
        
        print("🔐 Loading OAuth credentials...")
        // Load OAuth credentials from environment
        do {
            oauthCredentials = try TestHelpers.loadOAuthCredentials()
            print("✅ OAuth credentials loaded: \(oauthCredentials.username)")
        } catch {
            print("❌ Failed to load OAuth credentials: \(error)")
            XCTFail("Failed to load OAuth credentials: \(error)")
            throw error
        }

        app.launchEnvironment["XCODE_WAIT_FOR_IDLE_TIMEOUT"] = "5"
        
        print("🚀 Launching app...")
        // Launch app - XCTest will wait for app to idle after launch
        app.launch()
        print("📲 App launched, waiting for UI elements...")
        
        // Wait for app to fully load
        print("⏳ Waiting for loginTab button (10s timeout)...")
        let authTab = app.buttons["loginTab"]
        let launched = authTab.waitForExistence(timeout: 10)
        print("   → loginTab exists: \(authTab.exists), launched: \(launched)")
        XCTAssertTrue(launched, "App should launch successfully")
        print("✅ App UI loaded")
        
        print("🔍 Verifying fresh app state...")
        // Verify fresh app state
        do {
            try loginScreen.tapClear()
            Thread.sleep(forTimeInterval: 0.5)
            try testHelpers.assertFreshAppState()
            print("✅ Fresh app state verified")
        } catch {
            print("❌ Fresh app state check failed: \(error)")
            throw error
        }
        
        print("✅ setUp COMPLETE\n")
    }
    
    // TODO: clear token on setup

    override func tearDownWithError() throws {
        print("\n🧹 tearDown START")
        defer { print("✅ tearDown COMPLETE\n") }
        
        print("   Cleaning up app...")
        // Simply terminate without trying to interact with UI
        // This avoids hanging if app is in bad state
        app.terminate()
        print("   → App terminated")
    }
    
    // MARK: - Test Cases
    
    /// Test Case 1: Complete OAuth Login with Valid Credentials
    ///
    /// Flow:
    /// 1. Tap "Request Token" to initiate OAuth flow
    /// 2. Wait for ASWebAuthenticationSession to appear
    /// 3. Enter username and password in OAuth provider
    /// 4. Authorize (approve) the request
    /// 5. Verify app receives callback and shows authenticated state
    func testOAuthFlow_CompleteLoginWithValidCredentials() throws {
        print("\n🧪 TEST #1: testOAuthFlow_CompleteLoginWithValidCredentials")
        
        print("   Performing login...")
        try testHelpers.navigateToTab(name: "Login")
        try loginScreen.performLogin(
            oauthHelper: oauthHelper,
            credentials: oauthCredentials
        )
        
        print("✅ Test #1 PASSED: Login successful, app authenticated\n")
    }
    
    /// Test Case 2: ASWebAuthenticationSession Dismissed Before Completion
    ///
    /// Flow:
    /// 1. Tap "Request Token" to initiate OAuth flow
    /// 2. Wait for ASWebAuthenticationSession to appear
    /// 3. Dismiss the OAuth sheet before completing authorization
    /// 4. Verify app remains in not authenticated state
    ///
    /// Note: Behavioral equivalent to Android's "Chrome Tab Closed Before Completion" test
    func testOAuthFlow_ASWebAuthSessionDismissedBeforeCompletion() throws {
        throw XCTSkip("Mock Auth server returns 302. Won't have time to cancel")
        print("Starting: testOAuthFlow_ASWebAuthSessionDismissedBeforeCompletion")
        
        // Wait for app to launch
        Thread.sleep(forTimeInterval: 2)
        
        // Verify not authenticated at start
        try testHelpers.navigateToTab(name: "Login")
        XCTAssertTrue(
            loginScreen.verifyAuthStatus(expected: false),
            "Should start in not authenticated state"
        )
        
        // Start OAuth flow
        loginScreen.tapRequestToken()
        
        // Wait for OAuth UI to appear
        let oauthUIAppeared = oauthHelper.waitForOAuthUI(timeout: 8)
        XCTAssertTrue(oauthUIAppeared, "OAuth UI should appear")
        
        // Dismiss the OAuth sheet
        try oauthHelper.dismissOAuthSheet()
        
        // Wait for app to return to foreground
        Thread.sleep(forTimeInterval: 2)
        
        // Verify app is still in not authenticated state (no callback received)
        XCTAssertTrue(
            loginScreen.verifyAuthStatus(expected: false),
            "App should remain not authenticated after OAuth dismissal"
        )
        
        print("✓ OAuth dismissal handled correctly")
    }
    
    /// Test Case 3: Token Revocation After Login
    ///
    /// Flow:
    /// 1. Complete OAuth login (authenticated)
    /// 2. Navigate to Token tab
    /// 3. Tap "Revoke Token" button
    /// 4. Verify credentials are removed
    /// 5. Verify app shows not authenticated state
    func testOAuthFlow_TokenRevokeAfterLogin() throws {
        print("Starting: testOAuthFlow_TokenRevokeAfterLogin")
        
        // First, complete login
        try testHelpers.navigateToTab(name: "Login")
        try loginScreen.performLogin(
            oauthHelper: oauthHelper,
            credentials: oauthCredentials
        )
        
        XCTAssertTrue(
            loginScreen.verifyAuthStatus(expected: true),
            "Should be authenticated after login"
        )
        
        // Navigate to Token tab
        try testHelpers.navigateToTab(name: "Token")
        XCTAssertTrue(
            tokenScreen.isTokenDisplayed(),
            "Token details should be displayed"
        )
        
        // Revoke the token
        tokenScreen.tapRevokeToken()
        
        // Navigate back to Login tab to verify logout
        try testHelpers.navigateToTab(name: "Login")
        
        // Wait for authenticated status to change to not authenticated
        let loggedOut = loginScreen.waitForAuthStatus(expected: false, timeout: 5)
        XCTAssertTrue(
            loggedOut,
            "Should show not authenticated status after token revocation"
        )
        
        print("✓ Token revocation successful")
    }
    
    /// Test Case 4: Request Multiple Tokens and Credential Management
    ///
    /// Flow:
    /// 1. Complete OAuth login (1st credential)
    /// 2. Complete OAuth login again (2nd credential)
    /// 3. Navigate to Credentials tab
    /// 4. Verify "2 credentials stored" is displayed
    /// 5. Navigate to Token tab
    /// 6. Revoke the default credential
    /// 7. Verify credentials count decreases to 1
    /// 8. Verify DEFAULT badge is no longer displayed
    func testOAuthFlow_RequestMultipleTokens() throws {
        print("Starting: testOAuthFlow_RequestMultipleTokens")
        
        // First login - acquire 1st token
        try testHelpers.navigateToTab(name: "Login")
        try loginScreen.performLogin(
            oauthHelper: oauthHelper,
            credentials: oauthCredentials
        )
        
        // Wait between logins
        Thread.sleep(forTimeInterval: 0.5)
        
        try loginScreen.performLogin(
            oauthHelper: oauthHelper,
            credentials: oauthCredentials
        )
        
        // Wait for state to settle
        Thread.sleep(forTimeInterval: 0.5)
        
        // Verify still authenticated
        XCTAssertTrue(
            loginScreen.verifyAuthStatus(expected: true),
            "Should still be authenticated after 2nd login"
        )
        
        // Navigate to Credentials tab to verify 2 credentials exist
        try testHelpers.navigateToTab(name: "Creds")
        
        let twoCredentials = credentialsScreen.waitForCredentialCount(
            expected: 2,
            timeout: 5
        )
        XCTAssertTrue(
            twoCredentials,
            "Should show 2 credentials stored"
        )

        // Navigate to Token tab to revoke default credential
        try testHelpers.navigateToTab(name: "Token")
        tokenScreen.tapRevokeToken()
        
        // Navigate back to Credentials tab to verify count decreased
        try testHelpers.navigateToTab(name: "Creds")
        
        let oneCredential = credentialsScreen.waitForCredentialCount(
            expected: 1,
            timeout: 5
        )
        XCTAssertTrue(
            oneCredential,
            "Should show 1 credential stored after revocation"
        )
        
        print("✓ Multiple token and credential management verified")
    }
}
