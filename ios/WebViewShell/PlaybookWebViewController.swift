import UIKit
import WebKit

/// Minimal host VC: load Playbook web + attach bridge.
/// Allows official social embeds (X/TikTok/IG/Facebook) inside the page while
/// sending unexpected top-level navigations to Safari via openURL.
final class PlaybookWebViewController: UIViewController, WKNavigationDelegate, WKUIDelegate {
    private let bridge = PlaybookWebBridge()
    private var webView: WKWebView!

    /// Production by default. Use the PR preview URL while testing before Promote:
    /// https://playbook-git-cursor-share-intake-a-c09719-will-masseys-projects.vercel.app
    var startURL = URL(string: "https://playbook-pink.vercel.app")!

    private let appHosts: Set<String> = [
        "playbook-pink.vercel.app",
        "localhost",
        "127.0.0.1",
    ]

    /// Hosts that official embeds / oEmbed helpers may load (iframe + media).
    private let embedHostSuffixes = [
        "twitter.com", "x.com", "twimg.com", "syndication.twimg.com",
        "tiktok.com", "instagram.com", "cdninstagram.com",
        "facebook.com", "fbcdn.net", "fb.watch",
        "vercel.app",
    ]

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black

        let config = PlaybookWebBridge.makeConfiguration(bridge: bridge)
        config.preferences.javaScriptCanOpenWindowsAutomatically = true
        if #available(iOS 14.0, *) {
            config.defaultWebpagePreferences.allowsContentJavaScript = true
        }

        webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.isOpaque = false
        webView.backgroundColor = .black
        webView.allowsBackForwardNavigationGestures = false
        webView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(webView)
        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: view.topAnchor),
            webView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
        ])

        bridge.webView = webView
        bridge.presentingViewController = self

        webView.load(URLRequest(url: startURL))
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        bridge.injectPendingShares(SharedURLStore.peekPendingURLs())
    }

    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        guard let url = navigationAction.request.url else {
            decisionHandler(.allow)
            return
        }

        if navigationAction.targetFrame?.isMainFrame == false {
            decisionHandler(.allow)
            return
        }

        let host = (url.host ?? "").lowercased()
        if isAppHost(host) || isEmbedHost(host) || url.scheme == "about" || url.scheme == "blob" {
            decisionHandler(.allow)
            return
        }

        if let scheme = url.scheme?.lowercased(), scheme == "http" || scheme == "https" {
            UIApplication.shared.open(url)
            decisionHandler(.cancel)
            return
        }

        decisionHandler(.allow)
    }

    func webView(
        _ webView: WKWebView,
        createWebViewWith configuration: WKWebViewConfiguration,
        for navigationAction: WKNavigationAction,
        windowFeatures: WKWindowFeatures
    ) -> WKWebView? {
        if let url = navigationAction.request.url {
            UIApplication.shared.open(url)
        }
        return nil
    }

    private func isAppHost(_ host: String) -> Bool {
        if appHosts.contains(host) { return true }
        return host.hasSuffix(".vercel.app") && host.contains("playbook")
    }

    private func isEmbedHost(_ host: String) -> Bool {
        embedHostSuffixes.contains { host == $0 || host.hasSuffix(".\($0)") }
    }
}
