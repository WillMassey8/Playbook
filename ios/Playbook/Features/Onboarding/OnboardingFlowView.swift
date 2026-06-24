import SwiftUI

// MARK: - Onboarding models

enum OnboardingUserType: String, CaseIterable {
    case coach, fan
}

enum OnboardingLevel: String, CaseIterable {
    case hs, college, youth, pro

    var label: String {
        switch self {
        case .hs:      return "High school"
        case .college: return "College"
        case .youth:   return "Youth / other"
        case .pro:     return "Pro"
        }
    }
}

enum OnboardingStaff: String, CaseIterable {
    case solo, staff, large

    var label: String {
        switch self {
        case .solo:   return "No — just me"
        case .staff:  return "Yes — 2 to 6 coaches"
        case .large:  return "Yes — larger staff"
        }
    }
}

enum OnboardingReason: String, CaseIterable {
    case gamePrep, playbookLibrary, share, learn, trends, followTeam, loveFootball

    static let coachOptions: [OnboardingReason] =
        [.gamePrep, .playbookLibrary, .share, .learn, .trends]
    static let fanOptions: [OnboardingReason] =
        [.followTeam, .playbookLibrary, .share, .learn, .trends, .loveFootball]

    func label(isFan: Bool) -> String {
        switch self {
        case .gamePrep:         return "Game prep & install"
        case .playbookLibrary:  return "Build my playbook / library"
        case .share:            return isFan ? "Share with friends in the group chat" : "Share with my staff / team"
        case .learn:            return "Learn the game"
        case .trends:           return "Stay on top of trends"
        case .followTeam:       return "Follow my team / favorite coaches"
        case .loveFootball:     return "Just love great football"
        }
    }
}

enum OnboardingHabit: String, CaseIterable {
    case saveX, screenshot, groupChat, bookmarkForget

    var label: String {
        switch self {
        case .saveX:           return "Save it on X / Instagram"
        case .screenshot:      return "Screenshot or screen record"
        case .groupChat:       return "Send it to the group chat"
        case .bookmarkForget:  return "Bookmark it and forget"
        }
    }
}

enum OnboardingPain: String, CaseIterable {
    case saveForget, cantFind, groupChatLost, scrollAgain

    var label: String {
        switch self {
        case .saveForget:    return "I save and send plays all the time but never come back to them"
        case .cantFind:      return "I know I saved it somewhere but can't find it"
        case .groupChatLost: return "Our group chat is full of clips nobody can find later"
        case .scrollAgain:   return "I'm always scrolling X trying to find that one play again"
        }
    }
}

enum OnboardingFrequency: String, CaseIterable {
    case rare, weekly, often, constant

    var label: String {
        switch self {
        case .rare:     return "Rarely — a few a month"
        case .weekly:   return "Weekly — a handful"
        case .often:    return "Often — always saving or dropping clips in the chat"
        case .constant: return "Constantly — it's how I watch football"
        }
    }
}

private enum OnboardingStep: Hashable {
    case who, level, staff, why, habit, familiar, frequency, paywall
}

struct OnboardingAnswers {
    var userType: OnboardingUserType?
    var level: OnboardingLevel?
    var staff: OnboardingStaff?
    var reasons: Set<OnboardingReason> = []
    var habits: Set<OnboardingHabit> = []
    var pain: OnboardingPain?
    var frequency: OnboardingFrequency?
    var plan: PlanTier = .free

    mutating func resetCoachFields() {
        level = nil
        staff = nil
    }
}

// MARK: - Flow

struct OnboardingFlowView: View {
    var onComplete: () -> Void
    var onBack: () -> Void

    @State private var stepIndex = 0
    @State private var answers = OnboardingAnswers()

    private var steps: [OnboardingStep] {
        guard let type = answers.userType else { return [.who] }
        switch type {
        case .coach:
            return [.who, .level, .staff, .why, .habit, .familiar, .frequency, .paywall]
        case .fan:
            return [.who, .why, .habit, .familiar, .frequency, .paywall]
        }
    }

    private var step: OnboardingStep { steps[stepIndex] }

    private var canContinue: Bool {
        switch step {
        case .who:       return answers.userType != nil
        case .level:     return answers.level != nil
        case .staff:     return answers.staff != nil
        case .why:       return !answers.reasons.isEmpty
        case .habit:     return !answers.habits.isEmpty
        case .familiar:  return answers.pain != nil
        case .frequency: return answers.frequency != nil
        case .paywall:   return true
        }
    }

    private var continueTitle: String {
        guard step == .paywall else { return "Continue" }
        switch answers.plan {
        case .free:       return "Continue for free"
        case .individual: return "Start free trial"
        case .team:       return "Start team trial"
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            topBar
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    stepContent
                }
                .padding(.horizontal, Spacing.lg)
                .padding(.top, Spacing.lg)
                .padding(.bottom, Spacing.xl)
            }
            footer
        }
        .background(Color.pbBg.ignoresSafeArea())
        .preferredColorScheme(.dark)
    }

    // MARK: Top bar

    private var topBar: some View {
        HStack {
            Button(action: goBack) {
                Image(systemName: "chevron.left")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(.white.opacity(0.5))
                    .frame(width: 44, height: 44, alignment: .leading)
            }
            .buttonStyle(.plain)

            Spacer()

            HStack(spacing: 6) {
                ForEach(Array(steps.enumerated()), id: \.offset) { index, _ in
                    Capsule()
                        .fill(index <= stepIndex ? Color.pbGreen : Color.white.opacity(0.12))
                        .frame(width: index == stepIndex ? 20 : 6, height: 6)
                }
            }

            Spacer()

            Text("\(stepIndex + 1)/\(steps.count)")
                .font(.pbCaption)
                .foregroundStyle(.white.opacity(0.35))
                .frame(width: 44, alignment: .trailing)
        }
        .padding(.horizontal, Spacing.md)
        .padding(.top, Spacing.sm)
    }

    // MARK: Steps

    @ViewBuilder
    private var stepContent: some View {
        switch step {
        case .who:
            stepHeader(
                title: "Who are you?",
                subtitle: "We'll tailor Playbook to how you watch and save football."
            )
            optionList {
                optionRow("Coach", selected: answers.userType == .coach) {
                    answers.userType = .coach
                }
                optionRow("Fan", selected: answers.userType == .fan) {
                    answers.userType = .fan
                    answers.resetCoachFields()
                }
            }

        case .level:
            stepHeader(title: "What level do you coach?")
            optionList {
                ForEach(OnboardingLevel.allCases, id: \.self) { level in
                    optionRow(level.label, selected: answers.level == level) {
                        answers.level = level
                    }
                }
            }

        case .staff:
            stepHeader(
                title: "Do you share plays with other coaches?",
                subtitle: "Group chats are where plays go to die."
            )
            optionList {
                ForEach(OnboardingStaff.allCases, id: \.self) { staff in
                    optionRow(staff.label, selected: answers.staff == staff) {
                        answers.staff = staff
                    }
                }
            }

        case .why:
            stepHeader(title: "Why do you save plays?", subtitle: "Pick up to 2.")
            optionList {
                let options = answers.userType == .fan
                    ? OnboardingReason.fanOptions
                    : OnboardingReason.coachOptions
                ForEach(options, id: \.self) { reason in
                    multiOptionRow(
                        reason.label(isFan: answers.userType == .fan),
                        selected: answers.reasons.contains(reason)
                    ) {
                        toggleReason(reason)
                    }
                }
            }

        case .habit:
            stepHeader(title: "What do you do with a play you love?", subtitle: "Select all that apply.")
            optionList {
                ForEach(OnboardingHabit.allCases, id: \.self) { habit in
                    multiOptionRow(habit.label, selected: answers.habits.contains(habit)) {
                        toggleHabit(habit)
                    }
                }
            }

        case .familiar:
            stepHeader(title: "Which one sounds like you?")
            optionList {
                ForEach(OnboardingPain.allCases, id: \.self) { pain in
                    optionRow(pain.label, selected: answers.pain == pain) {
                        answers.pain = pain
                    }
                }
            }

        case .frequency:
            stepHeader(
                title: "How often do you save or send plays?",
                subtitle: "Saving and sending — not just bookmarking."
            )
            optionList {
                ForEach(OnboardingFrequency.allCases, id: \.self) { freq in
                    optionRow(freq.label, selected: answers.frequency == freq) {
                        answers.frequency = freq
                    }
                }
            }

        case .paywall:
            stepHeader(
                title: answers.userType == .fan
                    ? "Stop losing the plays you save and share"
                    : "Stop losing the plays you save and send",
                subtitle: "Every clip in one playbook — find it in seconds, not in a dead group chat."
            )
            optionList {
                planCard(.free, badge: "Free to start")
                planCard(.individual, badge: nil)
                if answers.userType == .coach {
                    let staffBadge = (answers.staff == .staff || answers.staff == .large) ? "Best for staff" : nil
                    planCard(.team, badge: staffBadge)
                }
            }
            Text(answers.plan == .free
                 ? "Upgrade anytime from Profile"
                 : "7-day free trial on paid plans · Cancel anytime")
                .font(.pbCaption)
                .foregroundStyle(.white.opacity(0.35))
                .multilineTextAlignment(.center)
                .frame(maxWidth: .infinity)
                .padding(.top, Spacing.sm)
        }
    }

    // MARK: Footer

    private var footer: some View {
        VStack(spacing: 0) {
            Divider().background(Color.white.opacity(0.08))
            Button(action: goNext) {
                Text(continueTitle)
            }
            .buttonStyle(PBButtonStyle())
            .disabled(!canContinue)
            .opacity(canContinue ? 1 : 0.45)
            .padding(.horizontal, Spacing.lg)
            .padding(.vertical, Spacing.md)
        }
        .background(Color.pbBg)
    }

    // MARK: Helpers

    private func stepHeader(title: String, subtitle: String? = nil) -> some View {
        VStack(alignment: .leading, spacing: subtitle == nil ? 0 : Spacing.sm) {
            Text(title)
                .font(.system(size: 28, weight: .regular, design: .serif))
                .foregroundStyle(.white)
                .fixedSize(horizontal: false, vertical: true)
            if let subtitle {
                Text(subtitle)
                    .font(.pbCallout)
                    .foregroundStyle(.white.opacity(0.5))
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .padding(.bottom, Spacing.lg)
    }

    private func optionList<Content: View>(@ViewBuilder content: () -> Content) -> some View {
        VStack(spacing: Spacing.sm) { content() }
    }

    private func optionRow(_ title: String, selected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(alignment: .top) {
                Text(title)
                    .font(.pbBody)
                    .foregroundStyle(.white)
                    .multilineTextAlignment(.leading)
                    .frame(maxWidth: .infinity, alignment: .leading)
                if selected {
                    Circle().fill(Color.pbGreen).frame(width: 8, height: 8).padding(.top, 6)
                }
            }
            .padding(Spacing.md)
            .background(selected ? Color.pbGreen.opacity(0.12) : Color.pbCard)
            .overlay(
                RoundedRectangle(cornerRadius: Radius.md)
                    .stroke(selected ? Color.pbGreen.opacity(0.6) : Color.white.opacity(0.08), lineWidth: 1.5)
            )
            .clipShape(RoundedRectangle(cornerRadius: Radius.md))
        }
        .buttonStyle(.plain)
    }

    private func multiOptionRow(_ title: String, selected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(alignment: .top, spacing: Spacing.md) {
                Text(title)
                    .font(.pbBody)
                    .foregroundStyle(.white)
                    .multilineTextAlignment(.leading)
                    .frame(maxWidth: .infinity, alignment: .leading)
                ZStack {
                    RoundedRectangle(cornerRadius: 6)
                        .stroke(selected ? Color.pbGreen : Color.white.opacity(0.25), lineWidth: 1.5)
                        .frame(width: 22, height: 22)
                    if selected {
                        RoundedRectangle(cornerRadius: 6)
                            .fill(Color.pbGreen)
                            .frame(width: 22, height: 22)
                        Image(systemName: "checkmark")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundStyle(.black)
                    }
                }
                .padding(.top, 2)
            }
            .padding(Spacing.md)
            .background(selected ? Color.pbGreen.opacity(0.12) : Color.pbCard)
            .overlay(
                RoundedRectangle(cornerRadius: Radius.md)
                    .stroke(selected ? Color.pbGreen.opacity(0.6) : Color.white.opacity(0.08), lineWidth: 1.5)
            )
            .clipShape(RoundedRectangle(cornerRadius: Radius.md))
        }
        .buttonStyle(.plain)
    }

    private func planCard(_ tier: PlanTier, badge: String?) -> some View {
        Button {
            answers.plan = tier
        } label: {
            VStack(alignment: .leading, spacing: 6) {
                if let badge {
                    Text(badge.uppercased())
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(.black)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 4)
                        .background(Color.pbGreen)
                        .clipShape(Capsule())
                        .padding(.bottom, 4)
                }
                HStack {
                    Text(tier.displayName)
                        .font(.pbHeadline)
                        .foregroundStyle(.white)
                    Spacer()
                    Text(tier.priceLabel)
                        .font(.pbHeadline)
                        .foregroundStyle(.white)
                }
                Text(tier == .free
                     ? "Save up to 10 clips · save from X & Instagram · personal playbook"
                     : tier.subtitle)
                    .font(.pbCaption)
                    .foregroundStyle(.white.opacity(0.5))
                    .multilineTextAlignment(.leading)
            }
            .padding(Spacing.md)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(answers.plan == tier ? Color.pbGreen.opacity(0.12) : Color.pbCard)
            .overlay(
                RoundedRectangle(cornerRadius: Radius.lg)
                    .stroke(answers.plan == tier ? Color.pbGreen.opacity(0.6) : Color.white.opacity(0.08), lineWidth: 1.5)
            )
            .clipShape(RoundedRectangle(cornerRadius: Radius.lg))
        }
        .buttonStyle(.plain)
    }

    private func toggleReason(_ reason: OnboardingReason) {
        if answers.reasons.contains(reason) {
            answers.reasons.remove(reason)
        } else if answers.reasons.count < 2 {
            answers.reasons.insert(reason)
        }
    }

    private func toggleHabit(_ habit: OnboardingHabit) {
        if answers.habits.contains(habit) {
            answers.habits.remove(habit)
        } else {
            answers.habits.insert(habit)
        }
    }

    private func goBack() {
        if stepIndex == 0 { onBack() }
        else { stepIndex -= 1 }
    }

    private func goNext() {
        if step == .paywall {
            UserPreferences.planTier = answers.plan
            UserPreferences.hasCompletedOnboarding = true
            onComplete()
            return
        }
        guard stepIndex < steps.count - 1 else { return }
        if steps[stepIndex + 1] == .paywall {
            answers.plan = .free
        }
        stepIndex += 1
    }
}

#Preview {
    OnboardingFlowView(onComplete: {}, onBack: {})
}
