import SwiftUI

// MARK: - Design tokens (STEEP — matches the web onboarding exactly)

private extension Color {
    init(hex: UInt) {
        self.init(.sRGB,
                  red: Double((hex >> 16) & 0xff) / 255,
                  green: Double((hex >> 8) & 0xff) / 255,
                  blue: Double(hex & 0xff) / 255,
                  opacity: 1)
    }
}

private enum OB {
    // Palette
    static let ink         = Color(hex: 0x17191C)
    static let white       = Color.white
    static let fog         = Color(hex: 0xF7F7F8)
    static let ash         = Color(hex: 0x4C4C4C)
    static let graphite    = Color(hex: 0x777B86)
    static let dove        = Color(hex: 0xA3A6AF)
    static let rust        = Color(hex: 0x5D2A1A)
    static let apricotWash = Color(hex: 0xFBE1D1)
    static let hairline    = Color(red: 167/255, green: 170/255, blue: 175/255).opacity(0.35)

    // Typography
    static func serif(_ size: CGFloat, medium: Bool = false) -> Font {
        Font.custom(medium ? "PlayfairDisplay-Medium" : "PlayfairDisplay-Regular", size: size)
    }
    static func sans(_ size: CGFloat, weight: Font.Weight = .regular) -> Font {
        let name: String
        switch weight {
        case .semibold, .bold: name = "Inter-SemiBold"
        case .medium:          name = "Inter-Medium"
        default:               name = "Inter-Regular"
        }
        return Font.custom(name, size: size)
    }

    static let pad: CGFloat = 28
}

// MARK: - Onboarding models

enum OnboardingUserType: String, CaseIterable { case coach, fan }

enum OnboardingLevel: String, CaseIterable {
    case hs, college, youth, pro
    var label: String {
        switch self {
        case .hs: return "High school"
        case .college: return "College"
        case .youth: return "Youth"
        case .pro: return "Pro"
        }
    }
    var icon: String {
        switch self {
        case .hs: return "building.columns"
        case .college: return "graduationcap"
        case .youth: return "figure.2.and.child.holdinghands"
        case .pro: return "trophy"
        }
    }
}

enum OnboardingRole: String, CaseIterable {
    case head, oc, dc, position, analyst
    var label: String {
        switch self {
        case .head: return "Head coach"
        case .oc: return "Offensive coordinator"
        case .dc: return "Defensive coordinator"
        case .position: return "Position coach"
        case .analyst: return "Analyst"
        }
    }
    var shortLabel: String {
        switch self {
        case .head: return "head coach"
        case .oc: return "offensive coordinator"
        case .dc: return "defensive coordinator"
        case .position: return "position coach"
        case .analyst: return "analyst"
        }
    }
    var icon: String {
        switch self {
        case .head: return "star.circle"
        case .oc: return "football"
        case .dc: return "shield"
        case .position: return "person"
        case .analyst: return "chart.bar"
        }
    }
}

enum OnboardingFocus: String, CaseIterable {
    case install, later, showGuys
    var label: String {
        switch self {
        case .install: return "I want to install it."
        case .later: return "It looked good. I might run it later."
        case .showGuys: return "I want to show it to my players."
        }
    }
    var icon: String {
        switch self {
        case .install: return "checklist"
        case .later: return "bookmark"
        case .showGuys: return "person.3"
        }
    }
}

enum OnboardingStaff: String, CaseIterable {
    case solo, staff, large
    var label: String {
        switch self {
        case .solo: return "No, just me"
        case .staff: return "Yes, 2 to 6 coaches"
        case .large: return "Yes, a larger staff"
        }
    }
    var icon: String {
        switch self {
        case .solo: return "person"
        case .staff: return "person.2"
        case .large: return "person.3"
        }
    }
}

enum OnboardingPain: String, CaseIterable {
    case likeNoSave, saveNoUtilize, screenshotsChat, installGap
    case saveForget, cantFind, groupChatLost, scrollAgain

    static let coachOptions: [OnboardingPain] = [.likeNoSave, .saveNoUtilize, .screenshotsChat, .installGap]
    static let fanOptions: [OnboardingPain]   = [.saveForget, .cantFind, .groupChatLost, .scrollAgain]

    var label: String {
        switch self {
        case .likeNoSave: return "I like a lot of plays and never save them."
        case .saveNoUtilize: return "I save them and never look at them again."
        case .screenshotsChat: return "They end up in screenshots and group chats."
        case .installGap: return "I plan to install it and never follow through."
        case .saveForget: return "I save clips and never go back to them."
        case .cantFind: return "I saved it somewhere and cannot find it."
        case .groupChatLost: return "They get buried in a group chat."
        case .scrollAgain: return "I end up scrolling X looking for it again."
        }
    }
    var icon: String {
        switch self {
        case .likeNoSave: return "hand.thumbsup"
        case .saveNoUtilize: return "bookmark.slash"
        case .screenshotsChat: return "photo.on.rectangle"
        case .installGap: return "calendar.badge.exclamationmark"
        case .saveForget: return "bookmark.slash"
        case .cantFind: return "magnifyingglass"
        case .groupChatLost: return "bubble.left.and.bubble.right"
        case .scrollAgain: return "arrow.clockwise"
        }
    }
    var mirror: String {
        switch self {
        case .likeNoSave: return "Save the plays you actually like."
        case .saveNoUtilize: return "A playbook you will actually open."
        case .screenshotsChat: return "Out of your camera roll, into a playbook."
        case .installGap: return "Save it, then install it."
        case .saveForget: return "Keep the clips you save."
        case .cantFind: return "Find a play when you need it."
        case .groupChatLost: return "Stop losing clips in group chats."
        case .scrollAgain: return "Stop hunting for that clip again."
        }
    }
    var previewLine: String {
        switch self {
        case .likeNoSave: return "Like it on X, then save it here in one tap."
        case .saveNoUtilize: return "Saved plays live in folders you will open again."
        case .screenshotsChat: return "One playbook instead of screenshots and chats."
        case .installGap: return "Clips ready when you are putting in install."
        case .saveForget: return "Your saves stay where you can find them."
        case .cantFind: return "Find a play without digging around."
        case .groupChatLost: return "Not buried in a chat."
        case .scrollAgain: return "You will not have to hunt on X again."
        }
    }
}

enum OnboardingVolume: String, CaseIterable {
    case light, medium, heavy, constant
    var label: String {
        switch self {
        case .light: return "A few times a week"
        case .medium: return "Most days"
        case .heavy: return "Often — most times I open X"
        case .constant: return "Constantly"
        }
    }
    var icon: String {
        switch self {
        case .light: return "calendar"
        case .medium: return "calendar.day.timeline.left"
        case .heavy: return "bolt"
        case .constant: return "infinity"
        }
    }
    var monthlyClips: Int {
        switch self {
        case .light: return 8
        case .medium: return 25
        case .heavy: return 60
        case .constant: return 120
        }
    }
}

/// Onboarding-local plan selection — mirrors the web paywall. Mapped to the
/// app's `PlanTier` only on completion (keeps Profile / StoreKit untouched).
enum OBPlan: Equatable { case annual, weekly, team5, team10 }

private enum OnboardingStep: Hashable {
    case who, level, role, focus, value, staff
    case pain, volume, commit
    case building, preview, paywall
}

struct OnboardingAnswers {
    var userType: OnboardingUserType?
    var level: OnboardingLevel?
    var role: OnboardingRole?
    var focus: OnboardingFocus?
    var staff: OnboardingStaff?
    var pain: OnboardingPain?
    var volume: OnboardingVolume?
    var plan: OBPlan = .annual

    mutating func resetCoachFields() {
        level = nil; role = nil; focus = nil; staff = nil
    }
    var sharesWithStaff: Bool { staff == .staff || staff == .large }
}

// MARK: - Playbook blueprint

struct PlaybookFolder: Identifiable {
    let id = UUID()
    let name: String
    let subs: [String]
}

struct PlaybookBlueprint {
    let identityLine: String
    let folders: [PlaybookFolder]
    let valueLines: [String]
    let shareLine: String
}

enum OnboardingContent {

    static func blueprint(for a: OnboardingAnswers) -> PlaybookBlueprint {
        a.userType == .fan ? fanPlaybook() : coachPlaybook(a)
    }

    static func coachPlaybook(_ a: OnboardingAnswers) -> PlaybookBlueprint {
        let level = a.level?.label ?? "Football"
        let role = a.role?.label ?? "Coach"

        let byRole: [OnboardingRole: [PlaybookFolder]] = [
            .head: [
                .init(name: "Offense", subs: ["Pass", "Run", "Red zone"]),
                .init(name: "Defense", subs: ["Fronts", "Coverage", "Pressure"]),
                .init(name: "Specials", subs: ["Returns", "Protection"]),
            ],
            .oc: [
                .init(name: "Pass", subs: ["RPO", "Dropback", "Screens"]),
                .init(name: "Run", subs: ["Inside zone", "Gap", "Toss"]),
                .init(name: "Situational", subs: ["3rd down", "Red zone", "2-minute"]),
            ],
            .dc: [
                .init(name: "Fronts", subs: ["Odd", "Even", "Okie"]),
                .init(name: "Coverage", subs: ["Man", "Zone", "Match"]),
                .init(name: "Pressure", subs: ["Sim", "Blitz", "Games"]),
            ],
            .position: [
                .init(name: "My room", subs: ["Technique", "Drills", "Examples"]),
                .init(name: "Install", subs: ["This week", "Must-haves"]),
                .init(name: "Ideas", subs: ["Liked", "Might run"]),
            ],
            .analyst: [
                .init(name: "Ideas", subs: ["Offense", "Defense", "Situational"]),
                .init(name: "Install", subs: ["This week", "Hold for later"]),
                .init(name: "Cutups", subs: ["Self", "Concepts"]),
            ],
        ]
        let folders = byRole[a.role ?? .head] ?? byRole[.head]!

        let valueLines: [String]
        switch a.focus {
        case .install:
            valueLines = [
                "Save a play once, and it goes into Install—not your camera roll.",
                "Pull it up before practice without digging through chats.",
                "Your staff can open the same folder you just filled.",
            ]
        case .later:
            valueLines = [
                "Keep the plays you like without losing them in screenshots.",
                "Come back when you are ready to put one in the book.",
                "Organized by concept, not by which app you saw it in.",
            ]
        case .showGuys:
            valueLines = [
                "Send one clean clip instead of a chat dump.",
                "Label it so your room knows what they are looking at.",
                "Reuse good examples next season without hunting through photos.",
            ]
        case .none:
            valueLines = [
                "Share from X or Instagram, and it lands in your book.",
                "Folders that match how you coach.",
                "One playbook for you and your staff.",
            ]
        }

        let shareLine: String
        switch a.focus {
        case .install: shareLine = "Share a play from X or Instagram, then drop it into this week's install."
        case .showGuys: shareLine = "Share a play, then send it to your players from here."
        default: shareLine = "Share a play from X or Instagram, and it lands in your playbook."
        }

        return PlaybookBlueprint(identityLine: "\(level) · \(role)", folders: folders,
                                 valueLines: valueLines, shareLine: shareLine)
    }

    static func fanPlaybook() -> PlaybookBlueprint {
        PlaybookBlueprint(
            identityLine: "Football fan",
            folders: [
                .init(name: "My team", subs: ["Offense", "Defense", "Highlights"]),
                .init(name: "Favorites", subs: ["Rewatch", "Send to friends"]),
                .init(name: "Ideas", subs: ["College", "NFL"]),
            ],
            valueLines: [
                "Save from X or Instagram in one tap.",
                "Stop losing clips in your camera roll.",
                "Find them later without scrolling for hours.",
            ],
            shareLine: "Share a clip, and it lands in your playbook."
        )
    }

    static func painMirror(_ pain: OnboardingPain?, userType: OnboardingUserType?) -> String {
        if let pain { return pain.mirror }
        return userType == .fan ? "Your football clips, in one place." : "Your plays, in one place."
    }

    struct CommitCard { let title: String; let body: String; let lines: [String] }

    static func personalCommitCard(_ a: OnboardingAnswers) -> CommitCard {
        let monthly = a.volume?.monthlyClips ?? 0
        let yearly = (monthly * 12).formatted()
        let book = blueprint(for: a)
        let folders = book.folders.prefix(3).map(\.name)

        if a.userType == .fan {
            let habit: String
            switch a.pain {
            case .cantFind: habit = "and then cannot find them when it matters"
            case .groupChatLost: habit = "and they disappear into group chats"
            case .scrollAgain: habit = "and end up hunting for them on X again"
            default: habit = "and rarely go back to them"
            }
            return CommitCard(
                title: "Built for how you watch football.",
                body: "You save clips \(habit). At your pace, that is about \(yearly) plays a year that should live in one place—not your camera roll.",
                lines: [
                    "Your folders: \(folders.joined(separator: ", ")).",
                    "Share from X or Instagram, and it lands here.",
                    "Find any clip without scrolling for it again.",
                ])
        }

        let level = a.level?.label.lowercased() ?? "football"
        let role = a.role?.shortLabel ?? "coach"
        let why: String
        switch a.focus {
        case .install: why = "you want to install them"
        case .showGuys: why = "you want to show them to your players"
        default: why = "they look good and you might run them later"
        }
        let stuck: String
        switch a.pain {
        case .likeNoSave: stuck = "Most of the time, the like is as far as it goes."
        case .saveNoUtilize: stuck = "When you do save them, they rarely get opened again."
        case .screenshotsChat: stuck = "Right now they die in screenshots and group chats."
        case .installGap: stuck = "You mean to put them in install, and then the week gets away from you."
        default: stuck = "They do not end up in a real playbook."
        }
        let staffLine = a.sharesWithStaff
            ? "Your staff should be looking at the same book you are."
            : "This can stay your personal book until you need to share it."
        let folderList = folders.isEmpty ? "your playbook" : folders.joined(separator: ", ")
        let shareLine: String
        switch a.focus {
        case .install: shareLine = "Share a play from X or Instagram, and drop it straight into install."
        case .showGuys: shareLine = "Share a play, then send a clean clip to your room."
        default: shareLine = "Share a play from X or Instagram, and keep it until you are ready to run it."
        }
        return CommitCard(
            title: "A \(level) \(role).",
            body: "You save plays because \(why). \(stuck) At your pace, that is roughly \(yearly) plays a year that belong in \(folderList)—not lost on your phone.",
            lines: [
                folders.isEmpty ? "We set up folders around how you coach." : "We set up \(folders.joined(separator: ", ")) for you.",
                shareLine,
                staffLine,
            ])
    }

    static func socialProof(_ a: OnboardingAnswers) -> (quote: String, by: String) {
        if a.userType == .fan {
            return ("Finally stopped losing clips in my camera roll.", "Marcus, football fan")
        }
        switch a.role {
        case .oc: return ("I used to lose install clips in my camera roll. Not anymore.", "OC, high school")
        case .dc: return ("Our staff finally looks at the same clips I save.", "DC, 5A")
        case .position: return ("It is easy to pull up examples for my room.", "WR coach")
        case .analyst: return ("The ideas I like actually stay organized.", "Analyst")
        case .head: return ("The whole staff is in one book instead of three chats.", "HC, high school")
        case .none: break
        }
        switch a.level {
        case .college: return ("Our staff actually opens this.", "OC, D2")
        case .youth: return ("Clips for the kids are not scattered anymore.", "Youth HC")
        case .pro: return ("Beats digging through old threads.", "QC")
        default: return ("Screenshots and group chats were a mess.", "HS coach")
        }
    }
}

// MARK: - Flow

struct OnboardingFlowView: View {
    var onComplete: () -> Void
    var onBack: () -> Void

    @State private var stepIndex = 0
    @State private var answers = OnboardingAnswers()
    @State private var advanceTask: Task<Void, Never>?
    @State private var planTab: PlanTab = .individual
    @State private var didSeedTeamTab = false
    @State private var showReverseTrial = false

    private enum PlanTab { case individual, team }

    private var steps: [OnboardingStep] {
        guard let type = answers.userType else { return [.who] }
        switch type {
        case .coach:
            return [.who, .level, .role, .focus, .value, .staff,
                    .pain, .volume, .commit, .building, .preview, .paywall]
        case .fan:
            return [.who, .value, .pain, .volume, .commit, .building, .preview, .paywall]
        }
    }
    private var step: OnboardingStep { steps[min(stepIndex, steps.count - 1)] }

    private var hideFooter: Bool {
        switch step {
        case .value, .commit, .preview, .paywall: return false
        default: return true
        }
    }
    private var hideTopBar: Bool { step == .building }

    private var canContinue: Bool {
        switch step {
        case .value, .commit, .preview, .paywall: return true
        default: return false
        }
    }

    private var continueTitle: String {
        switch step {
        case .value: return "Continue"
        case .commit: return "Set up my playbook"
        case .preview: return "See plans"
        case .paywall:
            switch answers.plan {
            case .team5, .team10: return "Get the Team plan"
            case .weekly: return "Start Weekly"
            case .annual: return "Start Annual"
            }
        default: return "Continue"
        }
    }

    private var displaySteps: [OnboardingStep] { steps.filter { $0 != .building } }
    private var displayIndex: Int {
        let shown = steps.prefix(stepIndex + 1).filter { $0 != .building }.count - 1
        return max(0, min(displaySteps.count - 1, shown))
    }

    var body: some View {
        ZStack {
            OB.fog.ignoresSafeArea()
            // Apricot radial glow, top-right
            Circle()
                .fill(RadialGradient(colors: [OB.apricotWash.opacity(0.7), .clear],
                                     center: .center, startRadius: 0, endRadius: 120))
                .frame(width: 240, height: 240)
                .offset(x: 120, y: -90)
                .allowsHitTesting(false)
                .ignoresSafeArea()

            VStack(spacing: 0) {
                if !hideTopBar { topBar }
                ScrollView {
                    VStack(alignment: .leading, spacing: 0) { stepContent }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, OB.pad)
                        .padding(.top, hideTopBar ? 0 : 24)
                        .padding(.bottom, 32)
                }
                if !hideTopBar && !hideFooter { footer }
            }

            if showReverseTrial {
                ReverseTrialSheet(
                    onAccept: { showReverseTrial = false; answers.plan = .annual; complete() },
                    onDecline: { showReverseTrial = false; complete() }
                )
                .transition(.opacity)
                .zIndex(1)
            }
        }
        .preferredColorScheme(.light)
        .tint(OB.rust)
        .animation(.easeOut(duration: 0.25), value: stepIndex)
        .animation(.easeOut(duration: 0.2), value: showReverseTrial)
        .onDisappear { advanceTask?.cancel() }
    }

    // MARK: Top bar

    private var topBar: some View {
        HStack {
            Button(action: goBack) {
                Image(systemName: "chevron.left")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(OB.graphite)
                    .frame(width: 44, height: 44, alignment: .leading)
            }
            .buttonStyle(.plain)

            Spacer()

            HStack(spacing: 6) {
                ForEach(Array(displaySteps.enumerated()), id: \.offset) { index, _ in
                    Capsule()
                        .fill(index <= displayIndex ? OB.rust : OB.fog)
                        .overlay(Capsule().stroke(index <= displayIndex ? .clear : OB.dove.opacity(0.4), lineWidth: 1))
                        .frame(width: index == displayIndex ? 20 : 6, height: 6)
                }
            }

            Spacer()

            Text("\(displayIndex + 1)/\(displaySteps.count)")
                .font(OB.sans(12))
                .foregroundStyle(OB.graphite)
                .frame(width: 44, alignment: .trailing)
        }
        .padding(.horizontal, 20)
        .padding(.top, 12)
    }

    // MARK: Steps

    @ViewBuilder
    private var stepContent: some View {
        switch step {
        case .who:
            StepShell(title: "Quick setup", subtitle: "A few questions so we can build your playbook.") {
                OptionRow(label: "I am a coach", icon: "figure.american.football",
                          selected: answers.userType == .coach) {
                    pickAndAdvance { answers.userType = .coach }
                }
                OptionRow(label: "I am a fan", icon: "sportscourt",
                          selected: answers.userType == .fan) {
                    pickAndAdvance { answers.userType = .fan; answers.resetCoachFields() }
                }
            }

        case .level:
            StepShell(title: "What level do you coach?", subtitle: "This helps us set up the right folders.") {
                ForEach(OnboardingLevel.allCases, id: \.self) { level in
                    OptionRow(label: level.label, icon: level.icon, selected: answers.level == level) {
                        pickAndAdvance { answers.level = level }
                    }
                }
            }

        case .role:
            StepShell(title: "What is your role?", subtitle: "We will set up folders for your side of the ball.") {
                ForEach(OnboardingRole.allCases, id: \.self) { role in
                    OptionRow(label: role.label, icon: role.icon, selected: answers.role == role) {
                        pickAndAdvance { answers.role = role }
                    }
                }
            }

        case .focus:
            StepShell(title: "When you save a play, why?", subtitle: "Most coaches save a play because they want to run it.") {
                ForEach(OnboardingFocus.allCases, id: \.self) { focus in
                    OptionRow(label: focus.label, icon: focus.icon, selected: answers.focus == focus) {
                        pickAndAdvance { answers.focus = focus }
                    }
                }
            }

        case .value:
            ValueRevealStep(blueprint: OnboardingContent.blueprint(for: answers))

        case .staff:
            StepShell(title: "Do you share plays with other coaches?", subtitle: "This helps us know if you need a team plan.") {
                ForEach(OnboardingStaff.allCases, id: \.self) { staff in
                    OptionRow(label: staff.label, icon: staff.icon, selected: answers.staff == staff) {
                        pickAndAdvance { answers.staff = staff }
                    }
                }
            }

        case .pain:
            StepShell(
                title: answers.userType == .coach ? "What usually happens after you like a play?" : "Which is closest to your experience?",
                subtitle: "Choose one."
            ) {
                ForEach(answers.userType == .fan ? OnboardingPain.fanOptions : OnboardingPain.coachOptions, id: \.self) { pain in
                    OptionRow(label: pain.label, icon: pain.icon, selected: answers.pain == pain) {
                        pickAndAdvance { answers.pain = pain }
                    }
                }
            }

        case .volume:
            StepShell(title: "How often do you save plays?", subtitle: "A rough estimate is fine.") {
                ForEach(OnboardingVolume.allCases, id: \.self) { volume in
                    OptionRow(label: volume.label, icon: volume.icon, selected: answers.volume == volume) {
                        pickAndAdvance { answers.volume = volume }
                    }
                }
            }

        case .commit:
            let card = OnboardingContent.personalCommitCard(answers)
            StepShell(title: card.title, subtitle: "Here is what we heard.") {
                VStack(alignment: .leading, spacing: 16) {
                    Text(card.body)
                        .font(OB.sans(15))
                        .foregroundStyle(OB.ink)
                        .lineSpacing(4)
                        .fixedSize(horizontal: false, vertical: true)
                    VStack(alignment: .leading, spacing: 10) {
                        ForEach(card.lines, id: \.self) { PreviewLine(text: $0) }
                    }
                }
                .padding(18)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(OB.white)
                .overlay(RoundedRectangle(cornerRadius: 18).stroke(OB.dove.opacity(0.3), lineWidth: 1.5))
                .clipShape(RoundedRectangle(cornerRadius: 18))
            }

        case .building:
            BuildingPlaybookStep(answers: answers, onDone: advance)

        case .preview:
            PlanPreviewStep(answers: answers)

        case .paywall:
            paywallStep
        }
    }

    // MARK: Paywall

    @ViewBuilder
    private var paywallStep: some View {
        let proof = OnboardingContent.socialProof(answers)
        StepShell(title: OnboardingContent.painMirror(answers.pain, userType: answers.userType)) {
            if answers.userType == .coach { planTabToggle }
            socialProofCard(proof)

            VStack(spacing: 10) {
                if answers.userType != .coach || planTab == .individual {
                    PlanCard(selected: answers.plan == .annual, name: "Annual", price: "$0.96/wk",
                             sublabel: "$49.99/year · unlimited playbook saves",
                             badge: "Best value", badgeBg: OB.rust, savings: "Save 84%") {
                        answers.plan = .annual
                    }
                    PlanCard(selected: answers.plan == .weekly, name: "Weekly", price: "$5.99/wk",
                             sublabel: "Unlimited playbook saves · billed weekly") {
                        answers.plan = .weekly
                    }
                } else {
                    PlanCard(selected: answers.plan == .team5, name: "5 Coaches", price: "$49.99/mo",
                             sublabel: "Up to 5 coaches · shared playbook · unlimited saves",
                             badge: answers.sharesWithStaff ? "Most popular" : nil, badgeBg: OB.ink) {
                        answers.plan = .team5
                    }
                    PlanCard(selected: answers.plan == .team10, name: "10 Coaches", price: "$79.99/mo",
                             sublabel: "Up to 10 coaches · shared playbook · unlimited saves") {
                        answers.plan = .team10
                    }
                }
            }
            .padding(.top, 10)

            trustLinks
        }
        .onAppear {
            if answers.sharesWithStaff && !didSeedTeamTab {
                didSeedTeamTab = true
                planTab = .team
                answers.plan = .team5
            }
        }
    }

    private var planTabToggle: some View {
        HStack(spacing: 4) {
            ForEach([PlanTab.individual, PlanTab.team], id: \.self) { tab in
                Button {
                    planTab = tab
                    answers.plan = tab == .team ? .team5 : .annual
                } label: {
                    Text(tab == .individual ? "Individual" : "Team")
                        .font(OB.sans(14, weight: .semibold))
                        .foregroundStyle(planTab == tab ? OB.ink : OB.graphite)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 9)
                        .background(planTab == tab ? OB.white : .clear)
                        .clipShape(RoundedRectangle(cornerRadius: 9))
                        .shadow(color: .black.opacity(planTab == tab ? 0.08 : 0), radius: 6, y: 2)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(4)
        .background(OB.fog)
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(OB.dove.opacity(0.3), lineWidth: 1))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func socialProofCard(_ proof: (quote: String, by: String)) -> some View {
        HStack(spacing: 10) {
            HStack(spacing: 1) {
                ForEach(0..<5, id: \.self) { _ in
                    Image(systemName: "star.fill").font(.system(size: 11)).foregroundStyle(OB.rust)
                }
            }
            (Text("“\(proof.quote)” ").font(OB.sans(12, weight: .medium)).foregroundStyle(OB.ink)
                + Text(proof.by).font(OB.sans(12)).foregroundStyle(OB.graphite))
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(.horizontal, 14).padding(.vertical, 12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(OB.white)
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(OB.dove.opacity(0.25), lineWidth: 1))
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }

    private var trustLinks: some View {
        HStack(spacing: 14) {
            Text("Restore purchases")
            Text("·").foregroundStyle(OB.dove)
            Link("Terms", destination: AppURLs.termsOfService).foregroundStyle(OB.graphite)
            Text("·").foregroundStyle(OB.dove)
            Link("Privacy", destination: AppURLs.privacyPolicy).foregroundStyle(OB.graphite)
        }
        .font(OB.sans(11))
        .foregroundStyle(OB.graphite)
        .frame(maxWidth: .infinity)
        .padding(.top, 6)
    }

    // MARK: Footer

    private var footer: some View {
        VStack(spacing: 0) {
            Rectangle().fill(OB.dove.opacity(0.18)).frame(height: 1)
            VStack(spacing: 0) {
                GlowButton(title: continueTitle, action: goNext).disabled(!canContinue).opacity(canContinue ? 1 : 0.5)
                if step == .paywall {
                    Button("Continue with the free plan") { showReverseTrial = true }
                        .font(OB.sans(14))
                        .foregroundStyle(OB.graphite)
                        .buttonStyle(.plain)
                        .padding(.top, 14)
                }
            }
            .padding(.horizontal, OB.pad)
            .padding(.top, 16)
            .padding(.bottom, 24)
        }
        .background(OB.white)
    }

    // MARK: Navigation

    private func pickAndAdvance(_ apply: () -> Void) {
        advanceTask?.cancel()
        apply()
        advanceTask = Task { @MainActor in
            try? await Task.sleep(nanoseconds: 280_000_000)
            guard !Task.isCancelled else { return }
            advance()
        }
    }

    private func advance() {
        guard stepIndex < steps.count - 1 else { return }
        if steps[stepIndex + 1] == .paywall {
            answers.plan = answers.sharesWithStaff ? .team5 : .annual
        }
        withAnimation { stepIndex += 1 }
    }

    private func goNext() {
        advanceTask?.cancel()
        if step == .paywall { complete(); return }
        advance()
    }

    private func goBack() {
        advanceTask?.cancel()
        if stepIndex == 0 { onBack() } else { withAnimation { stepIndex -= 1 } }
    }

    private func complete() {
        // Map the web plan onto the app's PlanTier for persistence.
        switch answers.plan {
        case .team5, .team10: UserPreferences.planTier = .team
        case .annual, .weekly: UserPreferences.planTier = .individual
        }
        UserPreferences.hasCompletedOnboarding = true
        onComplete()
    }
}

// MARK: - Reusable pieces

private struct StepShell<Content: View>: View {
    let title: String
    var subtitle: String? = nil
    @ViewBuilder var content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            VStack(alignment: .leading, spacing: subtitle == nil ? 0 : 12) {
                Text(title)
                    .font(OB.serif(28))
                    .foregroundStyle(OB.ink)
                    .fixedSize(horizontal: false, vertical: true)
                if let subtitle {
                    Text(subtitle)
                        .font(OB.sans(15))
                        .foregroundStyle(OB.graphite)
                        .lineSpacing(3)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            .padding(.bottom, 28)
            VStack(spacing: 10) { content }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

private struct OptionRow: View {
    let label: String
    let icon: String
    let selected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 12) {
                Image(systemName: icon)
                    .font(.system(size: 17))
                    .foregroundStyle(selected ? OB.white : OB.ink)
                    .frame(width: 40, height: 40)
                    .background(selected ? OB.rust : OB.fog)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                Text(label)
                    .font(OB.sans(15, weight: selected ? .medium : .regular))
                    .foregroundStyle(OB.ink)
                    .multilineTextAlignment(.leading)
                    .frame(maxWidth: .infinity, alignment: .leading)
                if selected {
                    Circle().fill(OB.rust).frame(width: 8, height: 8)
                }
            }
            .padding(.horizontal, 16).padding(.vertical, 14)
            .background(selected ? OB.apricotWash : OB.white)
            .overlay(RoundedRectangle(cornerRadius: 16)
                .stroke(selected ? OB.rust : OB.hairline, lineWidth: 1.5))
            .clipShape(RoundedRectangle(cornerRadius: 16))
        }
        .buttonStyle(.plain)
    }
}

private struct PreviewLine: View {
    let text: String
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: "checkmark")
                .font(.system(size: 10, weight: .bold))
                .foregroundStyle(OB.rust)
                .frame(width: 22, height: 22)
                .background(OB.apricotWash)
                .clipShape(Circle())
            Text(text)
                .font(OB.sans(14.5))
                .foregroundStyle(OB.ink)
                .lineSpacing(3)
                .fixedSize(horizontal: false, vertical: true)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.vertical, 2)
    }
}

private struct PlanCard: View {
    let selected: Bool
    let name: String
    let price: String
    let sublabel: String
    var badge: String? = nil
    var badgeBg: Color = OB.ink
    var savings: String? = nil
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 6) {
                HStack(alignment: .firstTextBaseline) {
                    Text(name).font(OB.sans(17, weight: .medium)).foregroundStyle(OB.ink)
                    Spacer()
                    Text(price).font(OB.sans(15, weight: .medium)).foregroundStyle(OB.ink)
                }
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    Text(sublabel)
                        .font(OB.sans(13)).foregroundStyle(OB.graphite)
                        .lineSpacing(2)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    if let savings {
                        Text(savings).font(OB.sans(11, weight: .semibold)).foregroundStyle(OB.rust)
                    }
                }
            }
            .padding(.horizontal, 18).padding(.vertical, 16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(selected ? OB.apricotWash : OB.white)
            .overlay(RoundedRectangle(cornerRadius: 20)
                .stroke(selected ? OB.rust : OB.hairline, lineWidth: 1.5))
            .clipShape(RoundedRectangle(cornerRadius: 20))
            .overlay(alignment: .topLeading) {
                if let badge {
                    Text(badge.uppercased())
                        .font(OB.sans(10, weight: .semibold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 10).padding(.vertical, 4)
                        .background(badgeBg)
                        .clipShape(Capsule())
                        .offset(x: 16, y: -9)
                }
            }
        }
        .buttonStyle(.plain)
        .padding(.top, badge != nil ? 9 : 0)
    }
}

private struct GlowButton: View {
    let title: String
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            Text(title)
                .font(OB.sans(16, weight: .semibold))
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .frame(height: 54)
                .background(OB.rust)
                .clipShape(RoundedRectangle(cornerRadius: 999))
                .shadow(color: OB.rust.opacity(0.35), radius: 16, y: 8)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Value reveal

private struct ValueRevealStep: View {
    let blueprint: PlaybookBlueprint
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 12) {
                Text("Here is your playbook.").font(OB.serif(28)).foregroundStyle(OB.ink)
                Text(blueprint.identityLine).font(OB.sans(15)).foregroundStyle(OB.graphite)
            }
            .padding(.bottom, 4)

            // Mini playbook card (dark, matches web)
            VStack(alignment: .leading, spacing: 8) {
                Text(blueprint.identityLine.uppercased())
                    .font(OB.sans(11, weight: .semibold)).foregroundStyle(.white.opacity(0.55))
                Text("Playbook").font(OB.serif(22)).foregroundStyle(.white).padding(.bottom, 6)
                ForEach(blueprint.folders) { folder in
                    VStack(alignment: .leading, spacing: 6) {
                        Text(folder.name).font(OB.sans(14, weight: .semibold)).foregroundStyle(.white)
                        FlowChips(items: folder.subs)
                    }
                    .padding(.horizontal, 12).padding(.vertical, 10)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.white.opacity(0.08))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                ZStack {
                    OB.ink
                    Circle().fill(RadialGradient(colors: [OB.rust.opacity(0.33), .clear],
                                                 center: .center, startRadius: 0, endRadius: 55))
                        .frame(width: 110, height: 110).offset(x: 70, y: -40)
                }
            )
            .clipShape(RoundedRectangle(cornerRadius: 20))

            VStack(alignment: .leading, spacing: 4) {
                ForEach(blueprint.valueLines, id: \.self) { PreviewLine(text: $0) }
            }

            Text(blueprint.shareLine)
                .font(OB.sans(13)).foregroundStyle(OB.ink).lineSpacing(2)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.horizontal, 14).padding(.vertical, 12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(OB.apricotWash)
                .overlay(RoundedRectangle(cornerRadius: 14).stroke(OB.rust.opacity(0.2), lineWidth: 1))
                .clipShape(RoundedRectangle(cornerRadius: 14))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

private struct FlowChips: View {
    let items: [String]
    var body: some View {
        HStack(spacing: 6) {
            ForEach(items, id: \.self) { item in
                Text(item)
                    .font(OB.sans(11)).foregroundStyle(.white.opacity(0.7))
                    .padding(.horizontal, 8).padding(.vertical, 3)
                    .background(Color.white.opacity(0.08))
                    .clipShape(Capsule())
            }
        }
    }
}

// MARK: - Building loader

private struct BuildingPlaybookStep: View {
    let answers: OnboardingAnswers
    let onDone: () -> Void
    @State private var progress: Double = 0
    @State private var stageIndex = 0

    private var stages: [String] {
        if answers.userType == .fan {
            return ["Setting up your folders…", "Connecting X and Instagram…", "Almost done…"]
        }
        let role = answers.role?.label.lowercased() ?? "coach"
        let focusLine: String
        switch answers.focus {
        case .install: focusLine = "Adding install folders…"
        case .showGuys: focusLine = "Adding folders for your room…"
        default: focusLine = "Adding folders for plays you like…"
        }
        return ["Setting up a \(role) playbook…", focusLine, "Connecting X and Instagram…", "Almost done…"]
    }

    var body: some View {
        VStack(spacing: 32) {
            ZStack {
                Circle().stroke(OB.dove.opacity(0.25), lineWidth: 4)
                Circle().trim(from: 0, to: progress)
                    .stroke(OB.rust, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                Text("\(Int(progress * 100))%").font(OB.serif(32)).foregroundStyle(OB.ink).monospacedDigit()
            }
            .frame(width: 120, height: 120)

            VStack(spacing: 14) {
                Text("Setting up your playbook…").font(OB.serif(26)).foregroundStyle(OB.ink)
                Text(stages[min(stageIndex, stages.count - 1)])
                    .font(OB.sans(14)).foregroundStyle(OB.graphite)
                    .animation(.easeInOut(duration: 0.25), value: stageIndex)
            }
            .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 48)
        .task { await run() }
    }

    private func run() async {
        let ticks = 70
        for t in 1...ticks {
            try? await Task.sleep(nanoseconds: 40_000_000)
            if Task.isCancelled { return }
            let p = Double(t) / Double(ticks)
            withAnimation(.linear(duration: 0.04)) { progress = p }
            stageIndex = min(stages.count - 1, Int(p * Double(stages.count)))
        }
        try? await Task.sleep(nanoseconds: 350_000_000)
        if Task.isCancelled { return }
        onDone()
    }
}

// MARK: - Plan preview

private struct PlanPreviewStep: View {
    let answers: OnboardingAnswers
    var body: some View {
        let monthly = answers.volume?.monthlyClips ?? 0
        let yearly = monthly * 12
        let book = OnboardingContent.blueprint(for: answers)
        let topFolders = book.folders.prefix(3).map(\.name).joined(separator: " · ")

        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 12) {
                Text("You are all set.").font(OB.serif(28)).foregroundStyle(OB.ink)
                Text(book.identityLine).font(OB.sans(15)).foregroundStyle(OB.graphite)
            }
            .padding(.bottom, 4)

            VStack(alignment: .leading, spacing: 6) {
                Text(book.identityLine.uppercased())
                    .font(OB.sans(11, weight: .semibold)).foregroundStyle(OB.rust)
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    Text(yearly.formatted()).font(OB.serif(48)).foregroundStyle(OB.ink)
                    Text("plays / year").font(OB.sans(14, weight: .medium)).foregroundStyle(OB.graphite)
                }
                Text("About \(monthly) plays a month across \(topFolders.isEmpty ? "your folders" : topFolders).")
                    .font(OB.sans(13)).foregroundStyle(OB.graphite).lineSpacing(2)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding(22)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(OB.white)
            .overlay(RoundedRectangle(cornerRadius: 20).stroke(OB.rust, lineWidth: 1.5))
            .clipShape(RoundedRectangle(cornerRadius: 20))

            VStack(alignment: .leading, spacing: 8) {
                if let pain = answers.pain { PreviewLine(text: pain.previewLine) }
                PreviewLine(text: book.shareLine)
                PreviewLine(text: (answers.userType == .coach && answers.sharesWithStaff)
                            ? "Shared playbook for your whole staff"
                            : book.valueLines.first ?? "Your plays, in one place.")
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

// MARK: - Reverse trial sheet

private struct ReverseTrialSheet: View {
    var onAccept: () -> Void
    var onDecline: () -> Void
    @State private var visible = false

    var body: some View {
        ZStack(alignment: .bottom) {
            Color.black.opacity(visible ? 0.55 : 0).ignoresSafeArea()
                .onTapGesture { dismiss(onDecline) }

            if visible {
                VStack(alignment: .leading, spacing: 0) {
                    Capsule().fill(OB.dove).frame(width: 36, height: 4)
                        .frame(maxWidth: .infinity).padding(.top, 10).padding(.bottom, 18)

                    Text("Try Pro free for 14 days.").font(OB.serif(28)).foregroundStyle(OB.ink)
                        .padding(.bottom, 12)
                    Text("No card required. Cancel anytime.").font(OB.sans(15)).foregroundStyle(OB.graphite)
                        .padding(.bottom, 24)

                    VStack(alignment: .leading, spacing: 10) {
                        PreviewLine(text: "Unlimited clips for 14 days")
                        PreviewLine(text: "Full access to every Pro feature")
                        PreviewLine(text: "No card required to start.")
                    }
                    .padding(.bottom, 24)

                    GlowButton(title: "Start 14-day free trial") { dismiss(onAccept) }

                    Button("Continue with the free plan") { dismiss(onDecline) }
                        .font(OB.sans(14)).foregroundStyle(OB.graphite).buttonStyle(.plain)
                        .frame(maxWidth: .infinity).padding(.top, 16)
                }
                .padding(.horizontal, 24).padding(.bottom, 40)
                .frame(maxWidth: .infinity)
                .background(OB.white)
                .clipShape(RoundedRectangle(cornerRadius: 24))
                .transition(.move(edge: .bottom))
            }
        }
        .onAppear { withAnimation(.easeOut(duration: 0.3)) { visible = true } }
    }

    private func dismiss(_ action: @escaping () -> Void) {
        withAnimation(.easeIn(duration: 0.25)) { visible = false }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.26, execute: action)
    }
}

#Preview {
    OnboardingFlowView(onComplete: {}, onBack: {})
}
