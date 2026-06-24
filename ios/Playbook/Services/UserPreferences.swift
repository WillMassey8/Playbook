import Foundation

enum PlanTier: String, Codable, CaseIterable {
    case free
    case individual
    case team

    var displayName: String {
        switch self {
        case .free:       return "Free"
        case .individual: return "Individual"
        case .team:       return "Team"
        }
    }

    var priceLabel: String {
        switch self {
        case .free:       return "$0"
        case .individual: return "$14.99/mo"
        case .team:       return "$49.99/mo"
        }
    }

    var clipLimit: Int {
        switch self {
        case .free:       return 10
        case .individual: return 75
        case .team:       return 2000
        }
    }

    var subtitle: String {
        switch self {
        case .free:
            return "Save up to 10 clips · personal playbook"
        case .individual:
            return "1 coach · 75 clips · personal playbook"
        case .team:
            return "Up to 6 coaches · 2,000 clips · shared playbook"
        }
    }
}

enum UserPreferences {
    private static let onboardingKey = "playbook.onboarding.complete"
    private static let planKey = "playbook.plan.tier"

    static var hasCompletedOnboarding: Bool {
        get { UserDefaults.standard.bool(forKey: onboardingKey) }
        set { UserDefaults.standard.set(newValue, forKey: onboardingKey) }
    }

    static var planTier: PlanTier {
        get {
            guard let raw = UserDefaults.standard.string(forKey: planKey),
                  let tier = PlanTier(rawValue: raw) else { return .free }
            return tier
        }
        set { UserDefaults.standard.set(newValue.rawValue, forKey: planKey) }
    }
}

enum AppURLs {
    static let privacyPolicy = URL(string: "https://apple.com/legal/privacy")!
    static let termsOfService = URL(string: "https://apple.com/legal/internet-services/itunes/us/terms.html")!
    static let feedback = URL(string: "mailto:support@playbook.app?subject=Playbook%20Feedback")!
    static let rateApp = URL(string: "https://apps.apple.com/app/id0000000000?action=write-review")!
}
