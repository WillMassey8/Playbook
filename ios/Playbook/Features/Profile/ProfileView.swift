import SwiftUI

struct ProfileView: View {
    @ObservedObject private var supabase = SupabaseService.shared
    @State private var vm = AuthViewModel()
    @State private var showSignOutConfirm = false
    @State private var showDeleteConfirm = false
    @State private var showDeleteTyped = false
    @State private var deleteConfirmText = ""
    @State private var showHowToShare = false
    @Environment(\.openURL) private var openURL

    private var plan: PlanTier { UserPreferences.planTier }
    private let clipsUsed = 47

    var body: some View {
        NavigationStack {
            ZStack {
                Color.pbBg.ignoresSafeArea()
                if supabase.session == nil {
                    AuthView()
                } else {
                    accountView
                }
            }
            .navigationBarHidden(true)
            .sheet(isPresented: $showHowToShare) {
                HowToShareView()
            }
        }
    }

    // MARK: - Account view

    private var accountView: some View {
        ScrollView {
            VStack(spacing: Spacing.lg) {
                header

                VStack(spacing: Spacing.sm) {
                    settingsSection("Plan") {
                        planRow
                    }

                    settingsSection("Share Extension") {
                        settingsRow(
                            icon: "square.and.arrow.up",
                            title: "How to share clips",
                            subtitle: "Share from Twitter/X or Instagram",
                            color: Color.pbGreen,
                            showChevron: true
                        ) {
                            showHowToShare = true
                        }
                    }

                    settingsSection("Legal") {
                        settingsRow(
                            icon: "hand.raised",
                            title: "Privacy Policy",
                            subtitle: "How we handle your data",
                            color: Color(red: 0.5, green: 0.4, blue: 1.0),
                            showChevron: true
                        ) {
                            openURL(AppURLs.privacyPolicy)
                        }

                        Divider().background(Color.pbDivider).padding(.horizontal, Spacing.md)

                        settingsRow(
                            icon: "doc.text",
                            title: "Terms of Service",
                            subtitle: "Usage terms",
                            color: .gray,
                            showChevron: true
                        ) {
                            openURL(AppURLs.termsOfService)
                        }
                    }

                    settingsSection("Support") {
                        settingsRow(
                            icon: "envelope",
                            title: "Send Feedback",
                            subtitle: "Report a bug or suggest a feature",
                            color: Color(red: 0.36, green: 0.61, blue: 1.0),
                            showChevron: true
                        ) {
                            openURL(AppURLs.feedback)
                        }

                        Divider().background(Color.pbDivider).padding(.horizontal, Spacing.md)

                        settingsRow(
                            icon: "star",
                            title: "Rate Playbook",
                            subtitle: "Leave a review on the App Store",
                            color: Color(red: 1, green: 0.78, blue: 0.2),
                            showChevron: true
                        ) {
                            openURL(AppURLs.rateApp)
                        }

                        Divider().background(Color.pbDivider).padding(.horizontal, Spacing.md)

                        settingsRow(
                            icon: "info.circle",
                            title: "Version",
                            subtitle: Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0",
                            color: .gray,
                            showChevron: false
                        ) {}
                            .disabled(true)
                    }

                    Button {
                        showSignOutConfirm = true
                    } label: {
                        HStack {
                            Image(systemName: "rectangle.portrait.and.arrow.right")
                                .foregroundStyle(.red)
                                .frame(width: 30)
                            Text("Sign Out")
                                .foregroundStyle(.red)
                            Spacer()
                        }
                        .font(.pbHeadline)
                        .padding()
                        .background(Color.pbCard)
                        .clipShape(RoundedRectangle(cornerRadius: Radius.md))
                    }
                    .buttonStyle(.plain)

                    Button {
                        showDeleteConfirm = true
                    } label: {
                        Text("Delete Account")
                            .font(.pbCallout)
                            .foregroundStyle(.red.opacity(0.8))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, Spacing.sm)
                    }
                    .buttonStyle(.plain)
                }
                .padding(.horizontal, Spacing.md)

                Spacer(minLength: Spacing.xxl)
            }
        }
        .confirmationDialog("Sign out of Playbook?", isPresented: $showSignOutConfirm, titleVisibility: .visible) {
            Button("Sign Out", role: .destructive) {
                Task { await vm.signOut() }
            }
            Button("Cancel", role: .cancel) {}
        }
        .confirmationDialog(
            "Delete your account?",
            isPresented: $showDeleteConfirm,
            titleVisibility: .visible
        ) {
            Button("Continue", role: .destructive) { showDeleteTyped = true }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This permanently removes your account and all saved clips. This cannot be undone.")
        }
        .alert("Type DELETE to confirm", isPresented: $showDeleteTyped) {
            TextField("DELETE", text: $deleteConfirmText)
            Button("Delete Account", role: .destructive) {
                guard deleteConfirmText == "DELETE" else { return }
                Task {
                    await vm.signOut()
                    UserPreferences.hasCompletedOnboarding = false
                    UserPreferences.planTier = .free
                }
            }
            Button("Cancel", role: .cancel) {
                deleteConfirmText = ""
            }
        } message: {
            Text("Account deletion will be processed. You have been signed out.")
        }
    }

    private var header: some View {
        VStack(spacing: Spacing.sm) {
            Circle()
                .fill(Color.pbGreen.opacity(0.2))
                .frame(width: 80, height: 80)
                .overlay(
                    Image(systemName: "person.fill")
                        .font(.system(size: 36))
                        .foregroundStyle(Color.pbGreen)
                )

            if let email = supabase.session?.user.email {
                Text(email)
                    .font(.pbTitle2)
                    .foregroundStyle(.white)
            }
            Text(plan.displayName)
                .font(.pbCallout)
                .foregroundStyle(.white.opacity(0.4))
        }
        .padding(.top, Spacing.xxl)
    }

    private var planRow: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(plan.displayName)
                        .font(.pbHeadline)
                        .foregroundStyle(.white)
                    Text(plan == .team
                         ? "Up to 6 coaches · shared playbook"
                         : plan == .individual
                         ? "Personal playbook"
                         : "Free tier")
                        .font(.pbCaption)
                        .foregroundStyle(.white.opacity(0.45))
                }
                Spacer()
                Text(plan.priceLabel)
                    .font(.pbCallout)
                    .foregroundStyle(Color.pbGreen)
            }

            ProgressView(value: Double(clipsUsed), total: Double(plan.clipLimit))
                .tint(Color.pbGreen)

            Text("\(clipsUsed) of \(plan.clipLimit) clips")
                .font(.pbCaption)
                .foregroundStyle(.white.opacity(0.4))

            if plan == .free {
                Text("Upgrade to Individual or Team anytime.")
                    .font(.pbCaption)
                    .foregroundStyle(.white.opacity(0.35))
            }
        }
        .padding(Spacing.md)
    }

    // MARK: - Settings helpers

    private func settingsSection<Content: View>(
        _ title: String,
        @ViewBuilder content: () -> Content
    ) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(title.uppercased())
                .font(.pbCaption)
                .foregroundStyle(.white.opacity(0.35))
                .padding(.horizontal, Spacing.md)
                .padding(.bottom, Spacing.xs)

            VStack(spacing: 0) {
                content()
            }
            .background(Color.pbCard)
            .clipShape(RoundedRectangle(cornerRadius: Radius.md))
        }
    }

    private func settingsRow(
        icon: String,
        title: String,
        subtitle: String,
        color: Color,
        showChevron: Bool = true,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            HStack(spacing: Spacing.md) {
                Image(systemName: icon)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 30, height: 30)
                    .background(color.opacity(0.25))
                    .clipShape(RoundedRectangle(cornerRadius: 8))

                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.pbBody)
                        .foregroundStyle(.white)
                    Text(subtitle)
                        .font(.pbCaption)
                        .foregroundStyle(.white.opacity(0.4))
                }

                Spacer()

                if showChevron {
                    Image(systemName: "chevron.right")
                        .font(.system(size: 12))
                        .foregroundStyle(.white.opacity(0.25))
                }
            }
            .padding()
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    ProfileView()
}
