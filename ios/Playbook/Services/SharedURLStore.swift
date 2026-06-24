import Foundation

enum SharedURLStore {
    private static var defaults: UserDefaults? {
        UserDefaults(suiteName: AppConstants.appGroupID)
    }

    // MARK: - Pending share URL

    static func savePendingURL(_ url: URL) {
        defaults?.set(url.absoluteString, forKey: AppConstants.pendingShareURLKey)
    }

    static func consumePendingURL() -> URL? {
        guard let raw = defaults?.string(forKey: AppConstants.pendingShareURLKey) else { return nil }
        defaults?.removeObject(forKey: AppConstants.pendingShareURLKey)
        return URL(string: raw)
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
}
