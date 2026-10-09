import Foundation

/// Resolves in-app playback for social clips.
/// - X: temporary muted CDN stream at view time (not downloaded or stored)
/// - Others: official platform embed URLs for WKWebView autoplay
enum PlaybackResolver {

    // MARK: - Embeds

    /// Prefer a stored embed URL; otherwise derive one from the source link.
    static func embedURL(for play: Play) -> URL? {
        if let stored = play.embedUrl, let url = URL(string: stored) {
            return url
        }
        return officialEmbedURL(from: play.sourceUrl)
    }

    static func officialEmbedURL(from sourceURL: String) -> URL? {
        if let tweetId = extractTweetId(from: sourceURL) {
            // Video-focused X player page — better full-bleed autoplay than the tweet card.
            return URL(string: "https://twitter.com/i/videos/tweet/\(tweetId)")
        }

        if let tiktokId = extractTikTokVideoId(from: sourceURL) {
            return URL(string: "https://www.tiktok.com/embed/v2/\(tiktokId)?autoplay=1")
        }

        if let shortcode = extractInstagramShortcode(from: sourceURL) {
            let isReel = sourceURL.range(of: #"instagram\.com/(?:reel|reels)/"#,
                                         options: .regularExpression) != nil
            let kind = isReel ? "reel" : "p"
            return URL(string: "https://www.instagram.com/\(kind)/\(shortcode)/embed/")
        }

        if isFacebookURL(sourceURL) {
            let encoded = sourceURL.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? sourceURL
            return URL(string:
                "https://www.facebook.com/plugins/video.php?href=\(encoded)&show_text=false&autoplay=true&mute=1&width=320&height=560&t=0"
            )
        }

        return nil
    }

    // MARK: - X temporary stream (muted AVPlayer, not stored)

    /// Public X video variant URL for muted in-app autoplay. Never persisted to Storage.
    static func twitterStreamURL(sourceURL: String) async -> URL? {
        guard let tweetId = extractTweetId(from: sourceURL) else { return nil }

        let token = syndicationToken(for: tweetId)
        let syndicationURL = URL(string:
            "https://cdn.syndication.twimg.com/tweet-result?id=\(tweetId)&lang=en&token=\(token)"
        )!
        var request = URLRequest(url: syndicationURL)
        request.setValue("Playbook/1.0", forHTTPHeaderField: "User-Agent")
        request.cachePolicy = .returnCacheDataElseLoad

        guard let (data, response) = try? await URLSession.shared.data(for: request),
              let http = response as? HTTPURLResponse,
              (200..<300).contains(http.statusCode),
              let payload = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let mediaDetails = payload["mediaDetails"] as? [[String: Any]]
        else { return nil }

        for media in mediaDetails {
            let type = media["type"] as? String
            guard type == "video" || type == "animated_gif" else { continue }

            guard let videoInfo = media["video_info"] as? [String: Any],
                  let variants = videoInfo["variants"] as? [[String: Any]]
            else { continue }

            let mp4s = variants.compactMap { variant -> (url: URL, bitrate: Int)? in
                guard let urlString = variant["url"] as? String,
                      let url = URL(string: urlString)
                else { return nil }
                let contentType = variant["content_type"] as? String
                guard contentType == nil || contentType == "video/mp4" else { return nil }
                let bitrate = variant["bitrate"] as? Int ?? 0
                return (url, bitrate)
            }
            .sorted { $0.bitrate > $1.bitrate }

            // Prefer a mid-tier variant for reliable mobile autoplay.
            if let preferred = mp4s.first(where: { $0.bitrate > 0 && $0.bitrate <= 2_500_000 }) {
                return preferred.url
            }
            if let best = mp4s.first?.url { return best }
        }

        return nil
    }

    /// Same token algorithm X's embed script / react-tweet uses.
    private static func syndicationToken(for id: String) -> String {
        guard let n = Double(id) else { return "0" }
        let value = (n / 1e15) * Double.pi
        return floatToBase36(value)
            .replacingOccurrences(of: "0", with: "")
            .replacingOccurrences(of: ".", with: "")
    }

    /// JavaScript-compatible `number.toString(36)` for positive values.
    private static func floatToBase36(_ value: Double) -> String {
        let chars = Array("0123456789abcdefghijklmnopqrstuvwxyz")
        let sign = value < 0 ? "-" : ""
        var x = abs(value)
        let intPart = Int(x)
        var intStr = ""
        var n = intPart
        if n == 0 {
            intStr = "0"
        } else {
            while n > 0 {
                intStr = String(chars[n % 36]) + intStr
                n /= 36
            }
        }
        var frac = x - Double(intPart)
        guard frac > 0 else { return sign + intStr }
        var fracStr = ""
        // Match typical JS precision for this token (~12–15 digits).
        for _ in 0..<16 {
            frac *= 36
            let digit = Int(frac)
            fracStr.append(chars[digit])
            frac -= Double(digit)
            if frac < 1e-12 { break }
        }
        return sign + intStr + "." + fracStr
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
