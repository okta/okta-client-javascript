import Foundation
import AuthenticationServices
import React

#if os(iOS)
import UIKit
#endif

#if os(iOS)

// Result types matching expo-web-browser
@objc(BrowserSessionResult)
class BrowserSessionResult: NSObject {
  @objc var type: String
  @objc var url: String?
  
  init(type: String, url: String? = nil) {
    self.type = type
    self.url = url
  }
  
  func toDictionary() -> [String: Any] {
    var dict: [String: Any] = ["type": type]
    if let url = url {
      dict["url"] = url
    }
    return dict
  }
}

// Main React Native module
@available(iOS 12.0, *)
@objc(BrowserSessionBridge)
class BrowserSessionBridge: NSObject {
  
  @objc
  static func moduleName() -> String! {
    return "BrowserSessionBridge"
  }
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return true
  }
  
  private var authSession: ASWebAuthenticationSession?
  
  @objc(openAuthSession:redirectScheme:options:resolve:reject:)
  func openAuthSession(
    _ url: String,
    redirectScheme: String,
    options: NSDictionary,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let urlObj = URL(string: url) else {
      reject("invalid_url", "Invalid URL provided", nil)
      return
    }
    
    // Extract ephemeralSession option with default value of false
    let ephemeralSession = (options["ephemeralSession"] as? NSNumber)?.boolValue ?? false
    
    DispatchQueue.main.async { [weak self] in
      guard let self = self else {
        reject("no_window", "BrowserSessionBridge is not available", nil)
        return
      }
      
      // Track if promise was already resolved to avoid double-resolve issues
      var completed = false
      
      // Use ASWebAuthenticationSession for OAuth
      let authSession = ASWebAuthenticationSession(
        url: urlObj,
        callbackURLScheme: redirectScheme
      ) { [weak self] callbackURL, error in
        // Prevent double-resolution
        guard !completed else { return }
        completed = true
        
        defer {
          // Clean up the reference to allow deallocation
          self?.authSession = nil
        }
        
        // Session completed or was cancelled
        if let error = error {
          // Check if it's a cancellation or a real error
          if let authError = error as? ASWebAuthenticationSessionError,
             authError.code == .canceledLogin {
            resolve(BrowserSessionResult(type: "cancel").toDictionary())
          } else {
            reject("browser_session_error", error.localizedDescription, error)
          }
          return
        }
        
        if let callbackURL = callbackURL {
          // OAuth flow completed, return the redirect URL
          resolve(BrowserSessionResult(type: "success", url: callbackURL.absoluteString).toDictionary())
        } else {
          // Shouldn't happen, but handle it
          resolve(BrowserSessionResult(type: "cancel").toDictionary())
        }
      }
      
      // Set presentation context provider for iOS 13+
      if #available(iOS 13.0, *) {
        authSession.presentationContextProvider = self
        authSession.prefersEphemeralWebBrowserSession = ephemeralSession
      }
      
      // Cancel any existing session before starting a new one
      if let existingSession = self.authSession {
        existingSession.cancel()
      }
      
      // Keep a reference to prevent deallocation
      self.authSession = authSession
      
      // Start the authentication session
      if authSession.start() {
        print("[BrowserSession] OAuth session started successfully")
      } else {
        guard !completed else { return }
        completed = true
        reject("browser_session_error", "Failed to start authentication session", nil)
        self.authSession = nil
      }
    }
  }
}

// MARK: - ASWebAuthenticationPresentationContextProviding
@available(iOS 13.0, *)
extension BrowserSessionBridge: ASWebAuthenticationPresentationContextProviding {
  @objc
  func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
    // Return the key window as the anchor for presentation
    if let window = UIApplication.shared.connectedScenes
      .compactMap({ $0 as? UIWindowScene })
      .first?.windows
      .first(where: { $0.isKeyWindow }) {
      return window
    }
    
    // Fallback to any available window
    if let window = UIApplication.shared.connectedScenes
      .compactMap({ $0 as? UIWindowScene })
      .first?.windows
      .first {
      return window
    }
    
    // Last resort - create a new window
    return UIWindow()
  }
}

#else

// Stub for non-iOS platforms
@objc(BrowserSessionBridge)
class BrowserSessionBridge: NSObject {
  @objc static func moduleName() -> String! { return "BrowserSessionBridge" }
  @objc static func requiresMainQueueSetup() -> Bool { return false }
  
  @objc(openAuthSession:redirectScheme:options:resolve:reject:)
  func openAuthSession(
    _ url: String,
    redirectScheme: String,
    options: NSDictionary,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    reject("platform_not_supported", "BrowserSessionBridge is only available on iOS", nil)
  }
}

#endif

