import SwiftUI
import WebKit

/// Full-bleed platform embed with muted autoplay kick — no re-hosted video files.
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
        if #available(iOS 15.0, *) {
            config.allowsPictureInPictureMediaPlayback = false
        }
        config.websiteDataStore = .nonPersistent()

        let prefs = WKWebpagePreferences()
        prefs.allowsContentJavaScript = true
        config.defaultWebpagePreferences = prefs

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.isOpaque = false
        webView.backgroundColor = .black
        webView.scrollView.isScrollEnabled = false
        webView.scrollView.bounces = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.isUserInteractionEnabled = true
        webView.navigationDelegate = context.coordinator
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        context.coordinator.onUnavailable = onUnavailable

        guard isActive else {
            context.coordinator.stopAutoplay()
            webView.stopLoading()
            webView.loadHTMLString(
                "<html><body style=\"background:#000;margin:0\"></body></html>",
                baseURL: nil
            )
            return
        }

        let target = embedURL.absoluteString
        if context.coordinator.loadedURL != target {
            context.coordinator.reset()
            context.coordinator.loadedURL = target
            // Load as a full-viewport autoplay shell that hosts the official embed.
            webView.loadHTMLString(
                Self.autoplayShellHTML(embedURL: embedURL),
                baseURL: embedURL
            )
        } else if isActive {
            context.coordinator.startAutoplay(in: webView)
        }
    }

    /// Official embed in a full-bleed shell; JS mutes + plays any same-document video.
    private static func autoplayShellHTML(embedURL: URL) -> String {
        let src = embedURL.absoluteString
            .replacingOccurrences(of: "&", with: "&amp;")
            .replacingOccurrences(of: "\"", with: "&quot;")
        return """
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8"/>
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"/>
          <style>
            html, body { margin:0; padding:0; width:100%; height:100%; background:#000; overflow:hidden; }
            iframe {
              position:fixed; inset:0; width:100%; height:100%; border:0;
              background:#000;
            }
          </style>
        </head>
        <body>
          <iframe
            id="player"
            src="\(src)"
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture; clipboard-write"
            allowfullscreen
            playsinline
            referrerpolicy="strict-origin-when-cross-origin"
          ></iframe>
          <script>
            // Same-document videos (if the embed renders into this frame via redirects).
            function kickLocal() {
              document.querySelectorAll('video').forEach(function(v) {
                try {
                  v.muted = true;
                  v.defaultMuted = true;
                  v.setAttribute('muted', '');
                  v.setAttribute('playsinline', '');
                  v.playsInline = true;
                  v.loop = true;
                  var p = v.play();
                  if (p && p.catch) p.catch(function(){});
                } catch (e) {}
              });
              var buttons = document.querySelectorAll(
                'button[aria-label*="Play"], button[aria-label*="play"], [data-testid="playButton"], .play-button'
              );
              buttons.forEach(function(b) { try { b.click(); } catch (e) {} });
            }
            setInterval(kickLocal, 700);
            kickLocal();
          </script>
        </body>
        </html>
        """
    }

    final class Coordinator: NSObject, WKNavigationDelegate {
        var onUnavailable: (() -> Void)?
        var loadedURL: String?
        private var didFail = false
        private var autoplayTimer: Timer?

        init(onUnavailable: (() -> Void)?) {
            self.onUnavailable = onUnavailable
        }

        func reset() {
            didFail = false
            stopAutoplay()
        }

        func stopAutoplay() {
            autoplayTimer?.invalidate()
            autoplayTimer = nil
        }

        func startAutoplay(in webView: WKWebView) {
            stopAutoplay()
            // Keep nudging muted play — platform embeds often delay media attach.
            autoplayTimer = Timer.scheduledTimer(withTimeInterval: 0.8, repeats: true) { [weak webView] _ in
                guard let webView else { return }
                webView.evaluateJavaScript(Self.autoplayJS, completionHandler: nil)
            }
            RunLoop.main.add(autoplayTimer!, forMode: .common)
            webView.evaluateJavaScript(Self.autoplayJS, completionHandler: nil)
        }

        private static let autoplayJS = """
        (function(){
          function kick(){
            document.querySelectorAll('video').forEach(function(v){
              try {
                v.muted = true; v.defaultMuted = true;
                v.setAttribute('muted',''); v.setAttribute('playsinline','');
                v.playsInline = true; v.loop = true;
                var p = v.play(); if (p && p.catch) p.catch(function(){});
              } catch(e){}
            });
            document.querySelectorAll(
              'button[aria-label*="Play"],button[aria-label*="play"],[data-testid="playButton"],.play-button,div[role="button"]'
            ).forEach(function(b){ try { b.click(); } catch(e){} });
          }
          kick();
        })();
        """

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            startAutoplay(in: webView)
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
            stopAutoplay()
            DispatchQueue.main.async { [weak self] in
                self?.onUnavailable?()
            }
        }
    }
}
