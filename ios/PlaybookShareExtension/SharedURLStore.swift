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
}
