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
        // Disable automatic screenshot capture to speed up tests
        continueAfterFailure = false
        
        // Initialize app
        app = XCUIApplication()
        testHelpers = TestHelpers(app: app)
        oauthHelper = OAuthHelper(app: app)
        loginScreen = LoginScreenPageObject(app: app)
        credentialsScreen = CredentialsScreenPageObject(app: app)
        tokenScreen = TokenScreenPageObject(app: app)
        
        // Load OAuth credentials from environment
        do {
            oauthCredentials = try TestHelpers.loadOAuthCredentials()
            print("✓ OAuth credentials loaded")
        } catch {
            XCTFail("Failed to load OAuth credentials: \(error)")
            throw error
        }
        
        // Launch app
        app.launch()
        
        // Wait for app to fully load
        let authTab = app.buttons["loginTab"]
        let launched = authTab.waitForExistence(timeout: 10)
        XCTAssertTrue(launched, "App should launch successfully")
        
        // Verify fresh app state
        try testHelpers.assertFreshAppState()
    }
    
    override func tearDownWithError() throws {
        // Clear app data after each test
        try testHelpers.navigateToTab(name: "Login")
        try testHelpers.tapClear()
        Thread.sleep(forTimeInterval: 1)
        
        app = nil
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
        print("Starting: testOAuthFlow_CompleteLoginWithValidCredentials")
        
        // Verify initial not authenticated state
        try loginScreen.performLogin(
            oauthHelper: oauthHelper,
            credentials: oauthCredentials
        )
        
        print("✓ Login successful, app authenticated")
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
        print("Starting: testOAuthFlow_ASWebAuthSessionDismissedBeforeCompletion")
        
        // Wait for app to launch
        Thread.sleep(forTimeInterval: 2)
        
        // Verify not authenticated at start
        try loginScreen.navigateToTab()
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
        try loginScreen.performLogin(
            oauthHelper: oauthHelper,
            credentials: oauthCredentials
        )
        
        XCTAssertTrue(
            loginScreen.verifyAuthStatus(expected: true),
            "Should be authenticated after login"
        )
        
        // Navigate to Token tab
        tokenScreen.navigateToTab()
        XCTAssertTrue(
            tokenScreen.isTokenDisplayed(),
            "Token details should be displayed"
        )
        
        // Revoke the token
        tokenScreen.tapRevokeToken()
        
        // Navigate back to Login tab to verify logout
        try loginScreen.navigateToTab()
        
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
        try loginScreen.performLogin(
            oauthHelper: oauthHelper,
            credentials: oauthCredentials
        )
        
        // Wait between logins
        Thread.sleep(forTimeInterval: 2)
        
        // Second login - acquire 2nd token
        // Note: Assuming ephemeralSession=true in app config, no bound redirect
        loginScreen.tapRequestToken()
        let oauthUIAppeared = oauthHelper.waitForOAuthUI(timeout: 8)
        XCTAssertTrue(oauthUIAppeared, "OAuth UI should appear for 2nd login")
        
        try oauthHelper.enterOAuthCredentials(
            username: oauthCredentials.username,
            password: oauthCredentials.password
        )
        try oauthHelper.waitForOAuthCompletion(timeout: 10)
        
        // Wait for state to settle
        Thread.sleep(forTimeInterval: 2)
        
        // Verify still authenticated
        XCTAssertTrue(
            loginScreen.verifyAuthStatus(expected: true),
            "Should still be authenticated after 2nd login"
        )
        
        // Navigate to Credentials tab to verify 2 credentials exist
        credentialsScreen.navigateToTab()
        
        let twoCredentials = credentialsScreen.waitForCredentialCount(
            expected: 2,
            timeout: 5
        )
        XCTAssertTrue(
            twoCredentials,
            "Should show 2 credentials stored"
        )
        
        XCTAssertTrue(
            credentialsScreen.isDefaultBadgeVisible(),
            "Should display DEFAULT badge for active credential"
        )
        
        // Navigate to Token tab to revoke default credential
        tokenScreen.navigateToTab()
        tokenScreen.tapRevokeToken()
        
        // Navigate back to Credentials tab to verify count decreased
        credentialsScreen.navigateToTab()
        
        let oneCredential = credentialsScreen.waitForCredentialCount(
            expected: 1,
            timeout: 5
        )
        XCTAssertTrue(
            oneCredential,
            "Should show 1 credential stored after revocation"
        )
        
        let defaultGone = credentialsScreen.waitForDefaultBadgeToDisappear(timeout: 3)
        XCTAssertTrue(
            defaultGone,
            "DEFAULT badge should no longer be displayed"
        )
        
        print("✓ Multiple token and credential management verified")
    }
}
