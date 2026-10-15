import Foundation

enum SharedURLStore {
    private static var defaults: UserDefaults? {
        UserDefaults(suiteName: AppConstants.appGroupID)
    }

    // MARK: - Pending share queue

    static func enqueuePendingURL(_ url: URL) {
        let url = canonicalizeURL(url)
        var queue = pendingQueue()
        let raw = url.absoluteString
        if !queue.contains(raw) { queue.append(raw) }
        defaults?.set(queue, forKey: AppConstants.pendingShareQueueKey)
        defaults?.set(raw, forKey: AppConstants.pendingShareURLKey)
    }

    static func savePendingURL(_ url: URL) {
        enqueuePendingURL(url)
    }

    /// Drain all pending share URLs (clears the queue).
    static func consumePendingURLs() -> [URL] {
        let raw = pendingQueue()
        defaults?.removeObject(forKey: AppConstants.pendingShareQueueKey)
        defaults?.removeObject(forKey: AppConstants.pendingShareURLKey)
        return raw.compactMap(URL.init(string:))
    }

    static func peekPendingURLs() -> [URL] {
        pendingQueue().compactMap(URL.init(string:))
    }

    static func removeURLs(_ urls: [String]) {
        guard !urls.isEmpty else { return }
        let drop = Set(urls)
        let kept = pendingQueue().filter { !drop.contains($0) }
        defaults?.set(kept, forKey: AppConstants.pendingShareQueueKey)
        if let last = kept.last {
            defaults?.set(last, forKey: AppConstants.pendingShareURLKey)
        } else {
            defaults?.removeObject(forKey: AppConstants.pendingShareURLKey)
        }
    }

    /// Legacy single-URL consumer.
    static func consumePendingURL() -> URL? {
        consumePendingURLs().first
    }

    private static func pendingQueue() -> [String] {
        var queue = defaults?.stringArray(forKey: AppConstants.pendingShareQueueKey) ?? []
        if let legacy = defaults?.string(forKey: AppConstants.pendingShareURLKey),
           !legacy.isEmpty, !queue.contains(legacy) {
            queue.insert(legacy, at: 0)
        }
        return queue
    }

    // MARK: - User JWT (written by main app, read by Share Extension)

    static func saveUserToken(_ token: String) {
        defaults?.set(token, forKey: AppConstants.pendingUserTokenKey)
    }

    static func loadUserToken() -> String? {
        defaults?.string(forKey: AppConstants.pendingUserTokenKey)
    }

    static func clearUserToken() {
        defaults?.removeObject(forKey: AppConstants.pendingUserTokenKey)
    }

    /// Collapse twitter/x hosts and strip common share-sheet tracking params.
    static func canonicalizeURL(_ url: URL) -> URL {
        guard var comps = URLComponents(url: url, resolvingAgainstBaseURL: false) else { return url }
        comps.fragment = nil
        let drop: Set<String> = ["s", "t", "ref_src", "ref_url", "fbclid", "igshid"]
        comps.queryItems = comps.queryItems?.filter { item in
            let name = item.name.lowercased()
            if name.hasPrefix("utm_") { return false }
            if drop.contains(name) { return false }
            return true
        }
        if let host = comps.host?.lowercased().replacingOccurrences(of: "www.", with: "", options: [.anchored]) {
            let mapped: String
            switch host {
            case "twitter.com", "mobile.twitter.com", "mobile.x.com":
                mapped = "x.com"
            default:
                mapped = host
            }
            comps.host = mapped
        }
        var path = comps.path
        while path.count > 1 && path.hasSuffix("/") { path.removeLast() }
        comps.path = path
        return comps.url ?? url
    }

}
