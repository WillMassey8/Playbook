import Foundation

/// App Group queue shared with the Share Extension.
/// Keep the app group id identical on the shell target and the extension.
enum WebShellAppGroup {
    /// Change this to match your Share Extension entitlements.
    static let id = "group.com.wymas.Playbook"
    static let pendingShareURLKey = "pendingShareURL"
    static let pendingShareQueueKey = "pendingShareURLQueue"
    static let pendingUserTokenKey = "pendingUserToken"
}

enum SharedURLStore {
    private static var defaults: UserDefaults? {
        UserDefaults(suiteName: WebShellAppGroup.id)
    }

    static func enqueuePendingURL(_ url: URL) {
        let url = canonicalizeURL(url)
        var queue = loadPendingQueue()
        let raw = url.absoluteString
        if !queue.contains(raw) { queue.append(raw) }
        defaults?.set(queue, forKey: WebShellAppGroup.pendingShareQueueKey)
        defaults?.set(raw, forKey: WebShellAppGroup.pendingShareURLKey)
    }

    static func loadPendingQueue() -> [String] {
        var queue = defaults?.stringArray(forKey: WebShellAppGroup.pendingShareQueueKey) ?? []
        if let legacy = defaults?.string(forKey: WebShellAppGroup.pendingShareURLKey),
           !legacy.isEmpty, !queue.contains(legacy) {
            queue.insert(legacy, at: 0)
        }
        return queue
    }

    /// Peek without clearing — safe to call before the web listener mounts.
    static func peekPendingURLs() -> [URL] {
        loadPendingQueue().compactMap(URL.init(string:))
    }

    /// Drain all pending share URLs (clears the queue).
    static func consumePendingURLs() -> [URL] {
        let raw = loadPendingQueue()
        defaults?.removeObject(forKey: WebShellAppGroup.pendingShareQueueKey)
        defaults?.removeObject(forKey: WebShellAppGroup.pendingShareURLKey)
        return raw.compactMap(URL.init(string:))
    }

    /// Remove URLs the web confirmed it ingested (keeps any newer shares).
    static func removeURLs(_ urls: [String]) {
        guard !urls.isEmpty else { return }
        let drop = Set(urls)
        let kept = loadPendingQueue().filter { !drop.contains($0) }
        defaults?.set(kept, forKey: WebShellAppGroup.pendingShareQueueKey)
        if let last = kept.last {
            defaults?.set(last, forKey: WebShellAppGroup.pendingShareURLKey)
        } else {
            defaults?.removeObject(forKey: WebShellAppGroup.pendingShareURLKey)
        }
    }

    static func saveUserToken(_ token: String) {
        defaults?.set(token, forKey: WebShellAppGroup.pendingUserTokenKey)
    }

    static func clearUserToken() {
        defaults?.removeObject(forKey: WebShellAppGroup.pendingUserTokenKey)
    }

    static func loadUserToken() -> String? {
        defaults?.string(forKey: WebShellAppGroup.pendingUserTokenKey)
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
