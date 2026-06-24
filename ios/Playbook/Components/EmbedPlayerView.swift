import SwiftUI
import WebKit

/// Plays third-party clips via official platform embed URLs (no re-hosted video).
struct EmbedPlayerView: UIViewRepresentable {
    let embedURL: URL
    var isActive: Bool = true

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.isOpaque = false
        webView.backgroundColor = .black
        webView.scrollView.isScrollEnabled = false
        webView.scrollView.bounces = false
        webView.isUserInteractionEnabled = false
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        guard isActive else {
            webView.loadHTMLString("<html><body style=\"background:#000\"></body></html>", baseURL: nil)
            return
        }

        if webView.url?.absoluteString != embedURL.absoluteString {
            webView.load(URLRequest(url: embedURL))
        }
    }
}
