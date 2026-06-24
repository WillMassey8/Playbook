import Foundation

// Mirrors the main app's SharedURLStore — keep in sync.

enum AppConstants {
    static let appGroupID            = "group.com.playbook.app"
    static let pendingShareURLKey    = "pendingShareURL"
    static let pendingUserTokenKey   = "pendingUserToken"
}

enum SharedURLStore {
    private static var defaults: UserDefaults? {
        UserDefaults(suiteName: AppConstants.appGroupID)
    }

    static func savePendingURL(_ url: URL) {
        defaults?.set(url.absoluteString, forKey: AppConstants.pendingShareURLKey)
    }

    static func loadUserToken() -> String? {
        defaults?.string(forKey: AppConstants.pendingUserTokenKey)
    }
}
