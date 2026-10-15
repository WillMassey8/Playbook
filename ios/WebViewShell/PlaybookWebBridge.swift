import UIKit
import WebKit
import AuthenticationServices
import CryptoKit

/// WKWebView bridge for the Playbook web app (`preview/`).
/// Message handler name must be exactly `playbook`.
final class PlaybookWebBridge: NSObject, WKScriptMessageHandler, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {

    weak var webView: WKWebView?
    weak var presentingViewController: UIViewController?

    private var appleNonce: String?

    static func makeConfiguration(bridge: PlaybookWebBridge) -> WKWebViewConfiguration {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.defaultWebpagePreferences.allowsContentJavaScript = true
        config.userContentController.add(bridge, name: "playbook")
        return config
    }

    // MARK: - WKScriptMessageHandler

    func userContentController(_ userContentController: WKUserContentController,
                               didReceive message: WKScriptMessage) {
        guard message.name == "playbook",
              let body = message.body as? [String: Any],
              let type = body["type"] as? String else { return }

        switch type {
        case "signInWithApple":
            startAppleSignIn()
        case "requestPendingShares":
            // Peek (do not clear) so a second request / late listener still sees items.
            // Web acks via categorizedIngested → removeURLs.
            injectPendingShares(SharedURLStore.peekPendingURLs())
        case "syncAuthToken":
            if let token = body["token"] as? String, !token.isEmpty {
                SharedURLStore.saveUserToken(token)
            } else {
                SharedURLStore.clearUserToken()
            }
        case "categorizedIngested":
            if let urls = body["urls"] as? [String] {
                SharedURLStore.removeURLs(urls)
            }
        case "openURL":
            if let raw = body["url"] as? String, let url = URL(string: raw),
               ["http", "https"].contains(url.scheme?.lowercased() ?? "") {
                UIApplication.shared.open(url)
            }
        case "purchase", "restore":
            // Wire StoreKit when paid plans ship.
            break
        default:
            break
        }
    }

    // MARK: - Native → web

    func injectPendingShares(_ urls: [URL]) {
        guard !urls.isEmpty else { return }
        let items = urls.map { ["url": $0.absoluteString] }
        guard let data = try? JSONSerialization.data(withJSONObject: items),
              let json = String(data: data, encoding: .utf8) else { return }
        let js = """
        window.__pbPendingCategorized = \(json);
        window.dispatchEvent(new CustomEvent('pb-add-categorized', {
          detail: { items: window.__pbPendingCategorized }
        }));
        """
        webView?.evaluateJavaScript(js, completionHandler: nil)
    }

    private func dispatchAppleSession(idToken: String?, nonce: String?, error: String?) {
        let detail: [String: Any]
        if let error {
            detail = ["error": error]
        } else if let idToken, let nonce {
            detail = ["idToken": idToken, "nonce": nonce]
        } else {
            detail = ["error": "Apple Sign In returned nothing"]
        }
        guard let data = try? JSONSerialization.data(withJSONObject: detail),
              let json = String(data: data, encoding: .utf8) else { return }
        let js = "window.dispatchEvent(new CustomEvent('pb-apple-session', { detail: \(json) }));"
        webView?.evaluateJavaScript(js, completionHandler: nil)
    }

    // MARK: - Sign in with Apple

    private func startAppleSignIn() {
        let raw = randomNonce()
        appleNonce = raw
        let request = ASAuthorizationAppleIDProvider().createRequest()
        request.requestedScopes = [.fullName, .email]
        request.nonce = sha256(raw)

        let controller = ASAuthorizationController(authorizationRequests: [request])
        controller.delegate = self
        controller.presentationContextProvider = self
        controller.performRequests()
    }

    func authorizationController(controller: ASAuthorizationController,
                                 didCompleteWithAuthorization authorization: ASAuthorization) {
        guard
            let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
            let tokenData = credential.identityToken,
            let idToken = String(data: tokenData, encoding: .utf8),
            let nonce = appleNonce
        else {
            dispatchAppleSession(idToken: nil, nonce: nil, error: "Apple Sign In failed")
            return
        }
        dispatchAppleSession(idToken: idToken, nonce: nonce, error: nil)
    }

    func authorizationController(controller: ASAuthorizationController,
                                 didCompleteWithError error: Error) {
        if let err = error as? ASAuthorizationError, err.code == .canceled {
            dispatchAppleSession(idToken: nil, nonce: nil, error: "canceled")
            return
        }
        dispatchAppleSession(idToken: nil, nonce: nil, error: error.localizedDescription)
    }

    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        presentingViewController?.view.window
            ?? UIApplication.shared.connectedScenes
                .compactMap { ($0 as? UIWindowScene)?.keyWindow }
                .first
            ?? ASPresentationAnchor()
    }

    // MARK: - Nonce

    private func randomNonce(length: Int = 32) -> String {
        let charset = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        var result = ""
        var remaining = length
        while remaining > 0 {
            var random: UInt8 = 0
            _ = SecRandomCopyBytes(kSecRandomDefault, 1, &random)
            if random < charset.count {
                result.append(charset[Int(random)])
                remaining -= 1
            }
        }
        return result
    }

    private func sha256(_ input: String) -> String {
        let data = Data(input.utf8)
        let hash = SHA256.hash(data: data)
        return hash.map { String(format: "%02x", $0) }.joined()
    }
}
