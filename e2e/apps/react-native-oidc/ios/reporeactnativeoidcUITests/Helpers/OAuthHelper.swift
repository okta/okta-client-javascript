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
        
        return app.webViews.element.exists
    }
    
    func enterOAuthCredentials(username: String, password: String) throws {
      throw NSError(domain: "OAuthHelper", code: 1,
        userInfo: [NSLocalizedDescriptionKey: "This method is not implemented. XCUITest cannot interact with `ASWebAuthenticationSession` views"]
      )
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
