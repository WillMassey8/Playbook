import Foundation

enum AppConstants {
    static let appGroupID          = "group.com.playbook.app"
    static let pendingShareURLKey  = "pendingShareURL"
    static let pendingUserTokenKey = "pendingUserToken"
    static let playVideosBucket    = "play-videos"
}

enum AppConfig {
    static var supabaseURL: URL {
        guard
            let urlString = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_URL") as? String,
            let url = URL(string: urlString)
        else {
            fatalError("Missing SUPABASE_URL in Info.plist")
        }
        return url
    }

    static var supabaseAnonKey: String {
        guard let key = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as? String else {
            fatalError("Missing SUPABASE_ANON_KEY in Info.plist")
        }
        return key
    }
}
