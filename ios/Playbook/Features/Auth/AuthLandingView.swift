import SwiftUI

enum UnauthPhase {
    case landing
    case onboarding
    case signIn
}

struct AuthLandingView: View {
    @State private var phase: UnauthPhase = .landing

    var body: some View {
        Group {
            switch phase {
            case .landing:
                landing
            case .onboarding:
                OnboardingFlowView(
                    onComplete: { phase = .signIn },
                    onBack: { phase = .landing }
                )
            case .signIn:
                AuthView(
                    showTrialSubtitle: UserPreferences.hasCompletedOnboarding,
                    onBack: { phase = .landing }
                )
            }
        }
        .animation(.easeInOut(duration: 0.25), value: phase)
    }

    private var landing: some View {
        ZStack {
            Color.pbBg.ignoresSafeArea()

            VStack(spacing: 0) {
                Spacer()

                VStack(spacing: Spacing.md) {
                    Image(systemName: "film.stack")
                        .font(.system(size: 52, weight: .semibold))
                        .foregroundStyle(Color.pbGreen)

                    Text("Playbook AI")
                        .font(.system(size: 40, weight: .regular, design: .serif))
                        .foregroundStyle(.white)

                    Text("Gameplanning, made smarter.")
                        .font(.pbCallout)
                        .foregroundStyle(.white.opacity(0.55))
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, Spacing.xl)
                }

                Spacer()

                VStack(spacing: Spacing.md) {
                    Button("Get Started") {
                        phase = UserPreferences.hasCompletedOnboarding ? .signIn : .onboarding
                    }
                    .buttonStyle(PBButtonStyle())

                    Button("Sign In") {
                        phase = .signIn
                    }
                    .buttonStyle(SecondaryButtonStyle())
                }
                .padding(.horizontal, Spacing.lg)
                .padding(.bottom, Spacing.xxl)
            }
        }
        .preferredColorScheme(.dark)
    }
}

#Preview {
    AuthLandingView()
}
