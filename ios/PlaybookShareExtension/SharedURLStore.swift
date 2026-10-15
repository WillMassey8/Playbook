import Foundation

// Mirrors the main app's SharedURLStore — keep in sync.

enum AppConstants {
    static let appGroupID            = "group.com.playbook.app"
    static let pendingShareURLKey    = "pendingShareURL"      // legacy single
    static let pendingShareQueueKey  = "pendingShareURLQueue" // multi-share queue
    static let pendingUserTokenKey   = "pendingUserToken"
}

enum SharedURLStore {
    private static var defaults: UserDefaults? {
        UserDefaults(suiteName: AppConstants.appGroupID)
    }

    /// Append a shared URL to the pending queue (does not overwrite prior shares).
    static func enqueuePendingURL(_ url: URL) {
        let url = canonicalizeURL(url)
        var queue = loadPendingQueue()
        let raw = url.absoluteString
        if !queue.contains(raw) {
            queue.append(raw)
        }
        defaults?.set(queue, forKey: AppConstants.pendingShareQueueKey)
        // Keep legacy key in sync for older main-app builds.
        defaults?.set(raw, forKey: AppConstants.pendingShareURLKey)
    }

    static func loadPendingQueue() -> [String] {
        var queue = defaults?.stringArray(forKey: AppConstants.pendingShareQueueKey) ?? []
        if let legacy = defaults?.string(forKey: AppConstants.pendingShareURLKey),
           !legacy.isEmpty, !queue.contains(legacy) {
            queue.insert(legacy, at: 0)
        }
        return queue
    }

    static func loadUserToken() -> String? {
        defaults?.string(forKey: AppConstants.pendingUserTokenKey)
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
