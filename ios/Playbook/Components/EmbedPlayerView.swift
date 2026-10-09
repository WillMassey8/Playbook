import SwiftUI
import WebKit

/// Plays third-party clips via official platform embed URLs (no re-hosted video).
struct EmbedPlayerView: UIViewRepresentable {
    let embedURL: URL
    var isActive: Bool = true
    var onUnavailable: (() -> Void)?

    func makeCoordinator() -> Coordinator {
        Coordinator(onUnavailable: onUnavailable)
    }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.websiteDataStore = .nonPersistent()

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.isOpaque = false
        webView.backgroundColor = .black
        webView.scrollView.isScrollEnabled = false
        webView.scrollView.bounces = false
        // Embeds (TikTok / IG / FB) need taps for play & platform chrome.
        webView.isUserInteractionEnabled = true
        webView.navigationDelegate = context.coordinator
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        context.coordinator.onUnavailable = onUnavailable

        guard isActive else {
            webView.stopLoading()
            webView.loadHTMLString(
                "<html><body style=\"background:#000;margin:0\"></body></html>",
                baseURL: nil
            )
            return
        }

        if webView.url?.absoluteString != embedURL.absoluteString {
            context.coordinator.reset()
            var request = URLRequest(url: embedURL)
            request.setValue(
                "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
                forHTTPHeaderField: "User-Agent"
            )
            webView.load(request)
        }
    }

    final class Coordinator: NSObject, WKNavigationDelegate {
        var onUnavailable: (() -> Void)?
        private var didFail = false

        init(onUnavailable: (() -> Void)?) {
            self.onUnavailable = onUnavailable
        }

        func reset() {
            didFail = false
        }

        func webView(
            _ webView: WKWebView,
            didFailProvisionalNavigation navigation: WKNavigation!,
            withError error: Error
        ) {
            markUnavailable()
        }

        func webView(
            _ webView: WKWebView,
            didFail navigation: WKNavigation!,
            withError error: Error
        ) {
            markUnavailable()
        }

        func webView(
            _ webView: WKWebView,
            decidePolicyFor navigationResponse: WKNavigationResponse,
            decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void
        ) {
            if let http = navigationResponse.response as? HTTPURLResponse,
               http.statusCode >= 400 {
                markUnavailable()
                decisionHandler(.cancel)
                return
            }
            decisionHandler(.allow)
        }

        private func markUnavailable() {
            guard !didFail else { return }
            didFail = true
            DispatchQueue.main.async { [weak self] in
                self?.onUnavailable?()
            }
        }
    }
}
