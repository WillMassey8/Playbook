import Foundation

/// Resolves a temporary stream URL for in-app playback. Does not download or store video.
enum PlaybackResolver {

    static func twitterStreamURL(sourceURL: String) async -> URL? {
        guard let tweetId = extractTweetId(from: sourceURL) else { return nil }

        let syndicationURL = URL(string:
            "https://cdn.syndication.twimg.com/tweet-result?id=\(tweetId)&lang=en&token=0"
        )!
        var request = URLRequest(url: syndicationURL)
        request.setValue("Playbook/1.0", forHTTPHeaderField: "User-Agent")

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

            if let best = mp4s.first?.url { return best }
        }

        return nil
    }

    private static func extractTweetId(from urlString: String) -> String? {
        let pattern = #"(?:twitter\.com|x\.com)/\w+/status/(\d+)"#
        guard let regex = try? NSRegularExpression(pattern: pattern, options: .caseInsensitive) else {
            return nil
        }
        let range = NSRange(urlString.startIndex..., in: urlString)
        guard let match = regex.firstMatch(in: urlString, range: range),
              let idRange = Range(match.range(at: 1), in: urlString)
        else { return nil }
        return String(urlString[idRange])
    }
}
