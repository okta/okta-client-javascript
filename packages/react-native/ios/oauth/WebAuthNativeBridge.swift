import Foundation
import React
import AuthenticationServices
import UIKit

@objc(WebAuthNativeBridge)
class WebAuthNativeBridge: NSObject {

    private var session: ASWebAuthenticationSession?

    @objc static func requiresMainQueueSetup() -> Bool {return true}   

    @objc(openAuthSessionAsync:redirectUri:preferEphemeral:resolver:rejecter:)
    func openAuthSessionAsync(
        _ authorizationUrl: String,
        redirectUri: String,
        preferEphemeral: Bool,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ){
        guard let url = URL(string: authorizationUrl) else {
            resolve(["type": "error", "message": "Invalid authorizationUrl"])
            return
        }

        let scheme = URL(string: redirectUri)?.scheme

        guard let callbackScheme = scheme, !callbackScheme.isEmpty else {
            resolve(["type": "error", "message": "Invalid redirectUri / callback scheme"])
            return
        }

        DispatchQueue.main.async {
            if self.session != nil {
                resolve(["type": "locked"])
                return
            }

            self.session = ASWebAuthenticationSession(url: url, callbackURLScheme: callbackScheme){
                callbackURL, error in

                defer {
                    self.session = nil
                }

                if let error = error as NSError? {
                    if error.domain == ASWebAuthenticationSessionError.errorDomain {
                        switch error.code {
                            case ASWebAuthenticationSessionError.canceledLogin.rawValue:
                                resolve(["type": "cancel"])
                                return
                            case ASWebAuthenticationSessionError.presentationContextNotProvided.rawValue:
                                resolve(["type": "dismiss"])
                                return
                            default:
                                break
                        }
                    }
                        

                    resolve(["type": "error", "message": error.localizedDescription])
                    return
                }

                guard let callbackURL = callbackURL else {
                    resolve(["type": "error", "message": "No callback URL received"])
                    return
                }

                resolve(["type": "success", "url": callbackURL.absoluteString])
                return
            }

            if #available(iOS 13.0, *) {
                self.session?.presentationContextProvider = self
                self.session?.prefersEphemeralWebBrowserSession = preferEphemeral
            }

            _ = self.session?.start()
        }
    }    

}

@available(iOS 13.0, *)
extension WebAuthNativeBridge: ASWebAuthenticationPresentationContextProviding {
    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor{
        let scene = UIApplication.shared.connectedScenes
        .compactMap { $0 as? UIWindowScene }
        .first(where: {$0.activationState == .foregroundActive })

        let window = scene?.windows.first(where: {$0.isKeyWindow}) ?? scene?.windows.first
        return window ?? ASPresentationAnchor()
    }
}