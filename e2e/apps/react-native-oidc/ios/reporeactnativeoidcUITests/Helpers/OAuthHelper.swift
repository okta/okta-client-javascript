import XCTest

/// Helper for managing ASWebAuthenticationSession interactions during OAuth flows
class OAuthHelper {
    let app: XCUIApplication
    
    init(app: XCUIApplication) {
        self.app = app
    }
    
    // MARK: - OAuth Flow Management
    
    /// Wait for ASWebAuthenticationSession OAuth UI to appear
    /// This waits for the system OAuth sheet to be presented
    /// - parameter timeout: Maximum time to wait for OAuth UI in seconds
    /// - returns: True if OAuth UI appeared, false if timeout
    func waitForOAuthUI(timeout: TimeInterval = 5) -> Bool {
        print("⏳ [OAuthHelper] Waiting for OAuth UI (timeout: \(timeout)s)...")
        let deadline = Date().addingTimeInterval(timeout)
        var attempts = 0
        let maxAttempts = Int(timeout * 10)
        
        while Date() < deadline && attempts < maxAttempts {
            // Check if any text field is visible that might be from the OAuth provider
            // This is a heuristic since ASWebAuthenticationSession webview is restricted
            let webviewElements = app.webViews
            if webviewElements.element.exists {
                print("✅ [OAuthHelper] Found webview element")
                return true
            }
            
            // Also check for any text containing "Sign In" or "Login" which might come from OAuth provider
            if app.staticTexts["Sign In"].exists || app.webViews.element.exists {
                print("✅ [OAuthHelper] Found OAuth UI element")
                return true
            }
            
            Thread.sleep(forTimeInterval: 0.1)
            attempts += 1
        }
        
        print("❌ [OAuthHelper] OAuth UI not found after \(attempts) attempts (\(timeout)s)")
        print("   DEBUG: webviews.count = \(app.webViews.count)")
        print("   DEBUG: staticTexts.count = \(app.staticTexts.count)")
        return app.webViews.element.exists
    }
    
    /// Attempt to enter OAuth credentials in the ASWebAuthenticationSession
    /// LIMITED FUNCTIONALITY: XCUITest has restricted access to ASWebAuthenticationSession webview.
    /// This method attempts to interact with form elements if they are accessible.
    /// - parameter username: Username to enter
    /// - parameter password: Password to enter
    /// - throws: OAuthError if interaction fails
    func enterOAuthCredentials(username: String, password: String) throws {
        // Wait for webview to load
        guard waitForOAuthUI(timeout: 8) else {
            throw OAuthError.webViewNotAccessible
        }
        
        let webView = app.webViews.element
        
        // // Attempt to find and fill username field
        // // Note: Safari/system webviews may expose form elements through the accessibility tree
        // let usernameField = webView.textFields.element(boundBy: 0)
        // if usernameField.exists {
        //     usernameField.tap()
        //     Thread.sleep(forTimeInterval: 0.2)
        //     usernameField.typeText(username)
        //     Thread.sleep(forTimeInterval: 0.3)
        // } else {
        //     // If direct field access fails, attempt keyboard input
        //     // This assumes the field is already focused
        //     let remoteDismiss = app.keys["Delete"]
        //     if remoteDismiss.exists {
        //         // Attempt to clear any existing text
        //         for _ in 0..<20 {
        //           remoteDismiss.press(forDuration: 0.5)
        //         }
        //     }
        //     app.typeText(username)
        // }

        app.typeText(username)
        app.typeText(XCUIKeyboardKey.enter.rawValue)

        Thread.sleep(forTimeInterval: 0.3)
        
        // let passwordField = webView.secureTextFields.element(boundBy: 0)
        // if passwordField.exists {
        //     passwordField.tap()
        //     Thread.sleep(forTimeInterval: 0.2)
        //     passwordField.typeText(password)
        //     Thread.sleep(forTimeInterval: 0.3)
        // } else {
        //     app.typeText(password)
        // }

        // TODO: select password authenticator

        app.typeText(password)
        app.typeText(XCUIKeyboardKey.enter.rawValue)
        
        // Attempt to submit form
        let submitButton = webView.buttons["Sign In"]
        if submitButton.exists {
            submitButton.tap()
        } else {
            // Try pressing Enter as fallback
            app.typeText("\n")
        }
        
        Thread.sleep(forTimeInterval: 0.5)
    }
    
    /// Wait for OAuth flow to complete and app to return to foreground
    /// Waits for the app's authentication status to update after OAuth callback
    /// - parameter timeout: Maximum time to wait for OAuth completion in seconds
    func waitForOAuthCompletion(timeout: TimeInterval = 8) throws {
        print("⏳ [OAuthHelper] Waiting for OAuth completion (timeout: \(timeout)s)...")
        let deadline = Date().addingTimeInterval(timeout)
        let authStatusProperty = "label"
        
        var authStatusFound = false
        var iterations = 0
        while Date() < deadline {
            iterations += 1
            // Check if app is back in foreground (no longer showing OAuth sheet)
            let webviewGone = !app.webViews.element.exists
            let appInForeground = app.staticTexts["Authentication"].exists || app.buttons["requestTokenButton"].exists
            
            if iterations % 20 == 0 {
                print("   [OAuthHelper iteration \(iterations)] webviewGone=\(webviewGone), appInForeground=\(appInForeground)")
            }
            
            if webviewGone && appInForeground {
                authStatusFound = true
                print("✅ [OAuthHelper] OAuth completion detected")
                break
            }
            
            Thread.sleep(forTimeInterval: 0.2)
        }
        
        guard authStatusFound else {
            print("❌ [OAuthHelper] OAuth completion timeout after \(iterations) iterations")
            throw OAuthError.completionTimeout
        }
        
        // Brief additional wait for app state to settle
        Thread.sleep(forTimeInterval: 0.5)
    }
    
    /// Dismiss the OAuth sheet (simulating user cancellation)
    /// This attempts to dismiss ASWebAuthenticationSession by tapping close or canceling
    func dismissOAuthSheet() throws {
        // Attempt to find and tap system close button (usually in top-left of OAuth sheet)
        let closeButton = app.buttons["Close"]
        if closeButton.exists {
            closeButton.tap()
            Thread.sleep(forTimeInterval: 0.5)
            return
        }
        
        // Fallback: try tapping cancel button
        let cancelButton = app.buttons["Cancel"]
        if cancelButton.exists {
            cancelButton.tap()
            Thread.sleep(forTimeInterval: 0.5)
            return
        }
        
        // If no close button found, try ESC key
        app.typeText("\u{1B}") // ESC key
        Thread.sleep(forTimeInterval: 0.5)
        
        // Verify dismiss was successful (OAuth sheet should be gone)
        let webviewGone = !app.webViews.element.exists
        XCTAssertTrue(webviewGone, "OAuth sheet should be dismissed")
    }
    
    /// Wait for app to transition from authenticated to not authenticated state
    /// Used when testing logout/revocation flows
    /// - parameter timeout: Maximum time to wait in seconds
    func waitForUnauthenticatedState(timeout: TimeInterval = 5) throws {
        let deadline = Date().addingTimeInterval(timeout)
        
        while Date() < deadline {
            let notAuthElement = app.staticTexts.element(containingText: "❌ Not Authenticated")
            if notAuthElement.exists {
                return
            }
            Thread.sleep(forTimeInterval: 0.2)
        }
        
        throw OAuthError.stateTransitionTimeout
    }
    
    /// Wait for app to transition to authenticated state
    /// - parameter timeout: Maximum time to wait in seconds
    func waitForAuthenticatedState(timeout: TimeInterval = 5) throws {
        let deadline = Date().addingTimeInterval(timeout)
        
        while Date() < deadline {
            let authElement = app.staticTexts.element(containingText: "✅ Authenticated")
            if authElement.exists {
                return
            }
            Thread.sleep(forTimeInterval: 0.2)
        }
        
        throw OAuthError.stateTransitionTimeout
    }
}

// MARK: - Error Types

enum OAuthError: Error, CustomStringConvertible {
    case webViewNotAccessible
    case completionTimeout
    case stateTransitionTimeout
    case dismissalFailed
    
    var description: String {
        switch self {
        case .webViewNotAccessible:
            return "ASWebAuthenticationSession webview is not accessible to XCUITest"
        case .completionTimeout:
            return "OAuth flow did not complete within timeout period"
        case .stateTransitionTimeout:
            return "App authentication state did not transition as expected"
        case .dismissalFailed:
            return "Failed to dismiss OAuth sheet"
        }
    }
}
