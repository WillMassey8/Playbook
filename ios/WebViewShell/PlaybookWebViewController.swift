import UIKit
import WebKit

/// Minimal host VC: load Playbook web + attach bridge.
final class PlaybookWebViewController: UIViewController, WKNavigationDelegate {
    private let bridge = PlaybookWebBridge()
    private var webView: WKWebView!

    /// Production by default. Use the PR preview URL while testing before Promote:
    /// https://playbook-git-cursor-share-intake-a-c09719-will-masseys-projects.vercel.app
    var startURL = URL(string: "https://playbook-pink.vercel.app")!

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black

        let config = PlaybookWebBridge.makeConfiguration(bridge: bridge)
        webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = self
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.isOpaque = false
        webView.backgroundColor = .black
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
        // Race-proof stash before React listeners mount. Do not clear the App Group queue here.
        bridge.injectPendingShares(SharedURLStore.peekPendingURLs())
    }
}
