import XCTest

/**
 E2E tests to confirm the functionality of `@okta/react-native-platform`, like `TokenStorage` and `BrowserSession`.

 NOTE: The iOS `BrowserSession` API uses `ASWebAuthenticationSession` which cannot be controlled/tested by XCUITest
 (XCUITest can only interact with the App process, while `ASWebAuthenticationSession` creates it's own). Therefore
 these tests are written against a Mock Authorization Server. This server returns mock responses and does not require
 entering any credentials into a UI, which eliminates the need for the tests to interact with the `ASWebAuthenticationSession`
 process altogether
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

        // Launch app - XCTest will wait for app to idle after launch
        app.launch()
        
        // Wait for app to fully load
        let authTab = app.buttons["loginTab"]
        let launched = authTab.waitForExistence(timeout: 10)

        XCTAssertTrue(launched, "App should launch successfully")

        print("🔍 Verifying fresh app state...")
        // Verify fresh app state
        do {
            try loginScreen.tapClear()      // clear any existing tokens
            Thread.sleep(forTimeInterval: 0.5)
            try testHelpers.assertFreshAppState()
            print("✅ Fresh app state verified")
        } catch {
            print("❌ Fresh app state check failed: \(error)")
            throw error
        }
    }

    override func tearDownWithError() throws {
        app.terminate()
    }
    
    // MARK: - Test Cases
    
    /// Happy path single token login
    func testOAuthFlow_CompleteLoginWithValidCredentials() throws {
        try testHelpers.navigateToTab(name: "Login")
        try loginScreen.performLogin(
            oauthHelper: oauthHelper,
            credentials: oauthCredentials
        )
    }
    
    /// Confirms the `ASWebAuthenticationSession` window can be dismissed and the app recovers gracefully
    func testOAuthFlow_ASWebAuthSessionDismissedBeforeCompletion() throws {
      /**
        Since the current state of this test suite uses a mock Authorization Server, the `ASWebAuthenticationSession`
        window only exists for a few moments (enough time for the /authorize 302 to occur). The window closes (due to 
        successful auth) before this test could dismiss the window. This test was passing against a live org before
        the migration was made to use a mock server. Skipping this test for now
      */
        throw XCTSkip("Mock Auth server returns 302. Won't have time to cancel")
        
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
    }
    
    /// Happy path single token acquisition then revoke
    func testOAuthFlow_TokenRevokeAfterLogin() throws {
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
    }
    
    /// Requests multiple tokens then revokes one
    func testOAuthFlow_RequestMultipleTokens() throws {
        
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
        
        Thread.sleep(forTimeInterval: 0.5)
        
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
    }
}
