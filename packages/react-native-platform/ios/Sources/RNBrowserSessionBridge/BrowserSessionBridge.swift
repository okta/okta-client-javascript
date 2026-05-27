import Foundation

#if os(iOS)
import WebKit
import UIKit
#endif

// Type aliases for Promise-like callbacks (compatible with React Native)
typealias PromiseResolveBlock = (Any?) -> Void
typealias PromiseRejectBlock = (String, String, Error?) -> Void

#if os(iOS)
@objc(BrowserSessionBridge)
class BrowserSessionBridge: NSObject {

    override init() {
        super.init()
        print("✅ BrowserSessionBridge initialized!")
    }

    @objc
    static func requiresMainQueueSetup() -> Bool {
        return true  // WebView operations must happen on main thread
    }

    @objc
    static func moduleName() -> String! {
        return "BrowserSessionBridge"
    }

    @objc
    func constantsToExport() -> [String: Any]! {
        return [
            "isAvailable": true
        ]
    }

    // MARK: - Browser Session Operations

    @objc(launchBrowserSession:resolve:reject:)
    func launchBrowserSession(_ url: String, resolve: @escaping PromiseResolveBlock, reject: @escaping PromiseRejectBlock) {
        do {
            guard let urlObj = URL(string: url) else {
                reject("invalid_url", "Invalid URL provided", nil)
                return
            }

            DispatchQueue.main.async {
                let webViewController = UIViewController()
                let webView = WKWebView(frame: webViewController.view.bounds)
                webView.load(URLRequest(url: urlObj))

                webViewController.view.addSubview(webView)

                // Get the key window and present the view controller
                if let keyWindow = UIApplication.shared.connectedScenes
                    .compactMap({ $0 as? UIWindowScene })
                    .first?.windows
                    .first(where: { $0.isKeyWindow }) {
                    keyWindow.rootViewController?.present(webViewController, animated: true) {
                        resolve(nil)
                    }
                } else {
                    reject("no_window", "Could not find key window", nil)
                }
            }
        }
    }

    @objc(closeBrowserSession:reject:)
    func closeBrowserSession(_ resolve: @escaping PromiseResolveBlock, reject: @escaping PromiseRejectBlock) {
        DispatchQueue.main.async {
            if let presentedViewController = UIApplication.shared.connectedScenes
                .compactMap({ $0 as? UIWindowScene })
                .first?.windows
                .first(where: { $0.isKeyWindow })?.rootViewController?.presentedViewController {
                presentedViewController.dismiss(animated: true) {
                    resolve(nil)
                }
            } else {
                resolve(nil)  // Already closed
            }
        }
    }
}
#else
// Stub for non-iOS platforms (for SPM testing on macOS)
@objc(BrowserSessionBridge)
class BrowserSessionBridge: NSObject {
    @objc static func requiresMainQueueSetup() -> Bool { return false }
    @objc static func moduleName() -> String! { return "BrowserSessionBridge" }
    @objc func constantsToExport() -> [String: Any]! { return ["isAvailable": false] }
}
#endif

