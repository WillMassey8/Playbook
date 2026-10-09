import Foundation

/// Builds official platform embed URLs for in-app WKWebView playback.
/// Does not download, scrape CDN MP4s, or rehost third-party video.
enum PlaybackResolver {

    /// Prefer a stored embed URL; otherwise derive one from the source link.
    static func embedURL(for play: Play) -> URL? {
        if let stored = play.embedUrl, let url = URL(string: stored) {
            return url
        }
        return officialEmbedURL(from: play.sourceUrl)
    }

    static func officialEmbedURL(from sourceURL: String) -> URL? {
        if let tweetId = extractTweetId(from: sourceURL) {
            return URL(string:
                "https://platform.twitter.com/embed/Tweet.html?id=\(tweetId)&theme=dark&dnt=true"
            )
        }

        if let tiktokId = extractTikTokVideoId(from: sourceURL) {
            return URL(string: "https://www.tiktok.com/embed/v2/\(tiktokId)")
        }

        if let shortcode = extractInstagramShortcode(from: sourceURL) {
            let isReel = sourceURL.range(of: #"instagram\.com/(?:reel|reels)/"#,
                                         options: .regularExpression) != nil
            let kind = isReel ? "reel" : "p"
            return URL(string: "https://www.instagram.com/\(kind)/\(shortcode)/embed/captioned/")
        }

        if isFacebookURL(sourceURL) {
            let encoded = sourceURL.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? sourceURL
            return URL(string:
                "https://www.facebook.com/plugins/video.php?href=\(encoded)&show_text=false&width=320&height=560&t=0"
            )
        }

        return nil
    }

    // MARK: - Parsers

    private static func extractTweetId(from urlString: String) -> String? {
        firstCapture(
            in: urlString,
            pattern: #"(?:twitter\.com|x\.com)/(?:\w+/)?status(?:es)?/(\d+)"#
        )
    }

    private static func extractTikTokVideoId(from urlString: String) -> String? {
        if let id = firstCapture(
            in: urlString,
            pattern: #"tiktok\.com/@[^/]+/video/(\d+)"#
        ) {
            return id
        }
        return firstCapture(
            in: urlString,
            pattern: #"tiktok\.com/embed(?:/v2)?/(\d+)"#
        )
    }

    private static func extractInstagramShortcode(from urlString: String) -> String? {
        firstCapture(
            in: urlString,
            pattern: #"instagram\.com/(?:p|reel|reels|tv)/([A-Za-z0-9_-]+)"#
        )
    }

    private static func isFacebookURL(_ urlString: String) -> Bool {
        guard let host = URL(string: urlString)?.host?.lowercased() else { return false }
        let bare = host.replacingOccurrences(of: "www.", with: "")
        return bare == "facebook.com"
            || bare.hasSuffix(".facebook.com")
            || bare == "fb.watch"
            || bare == "fb.com"
            || bare == "m.facebook.com"
    }

    private static func firstCapture(in string: String, pattern: String) -> String? {
        guard let regex = try? NSRegularExpression(pattern: pattern, options: .caseInsensitive) else {
            return nil
        }
        let range = NSRange(string.startIndex..., in: string)
        guard let match = regex.firstMatch(in: string, range: range),
              match.numberOfRanges > 1,
              let idRange = Range(match.range(at: 1), in: string)
        else { return nil }
        return String(string[idRange])
    }
}
