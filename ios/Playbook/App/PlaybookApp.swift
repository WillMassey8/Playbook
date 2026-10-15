import SwiftUI

@main
struct PlaybookApp: App {
    @StateObject private var supabase = SupabaseService.shared
    @State private var pendingSharedURLs: [URL] = []
    @State private var showAddClip = false

    var body: some Scene {
        WindowGroup {
            RootView(
                pendingSharedURLs: $pendingSharedURLs,
                showAddClip: $showAddClip
            )
            .environmentObject(supabase)
            .preferredColorScheme(.dark)
            .onOpenURL { url in
                if url.scheme == "playbook", url.host == "share" {
                    let pending = SharedURLStore.consumePendingURLs()
                    if !pending.isEmpty {
                        pendingSharedURLs = pending
                    }
                }
                // Supabase Apple OAuth callback (if using ASWebAuthenticationSession).
                if url.scheme == "playbook" {
                    Task { try? await supabase.client.auth.session(from: url) }
                }
            }
            .onAppear {
                let pending = SharedURLStore.consumePendingURLs()
                if !pending.isEmpty {
                    pendingSharedURLs = pending
                }
            }
        }
    }
}

// MARK: - Root

struct RootView: View {
    @Binding var pendingSharedURLs: [URL]
    @Binding var showAddClip: Bool
    @EnvironmentObject private var supabase: SupabaseService

    private var activeIntakeURL: URL? { pendingSharedURLs.first }

    var body: some View {
        ZStack {
            Group {
                if supabase.session == nil {
                    AuthLandingView()
                } else {
                    MainTabView(showAddClip: $showAddClip)
                }
            }

            // After share + login: full-screen video + categorize — first thing you see.
            if supabase.session != nil, let url = activeIntakeURL {
                SharedClipIntakeView(
                    sourceURL: url,
                    onDone: { advanceIntake() },
                    onSkip: { advanceIntake() }
                )
                .transition(.opacity)
                .zIndex(50)
            }
        }
        .animation(.easeInOut(duration: 0.3), value: supabase.session == nil)
        .animation(.easeInOut(duration: 0.25), value: pendingSharedURLs.count)
    }

    private func advanceIntake() {
        if !pendingSharedURLs.isEmpty {
            pendingSharedURLs.removeFirst()
        }
    }
}

// MARK: - Main tab view

struct MainTabView: View {
    @Binding var showAddClip: Bool

    var body: some View {
        TabView {
            HomeView(showAdd: $showAddClip)
                .tabItem {
                    Label("Home", systemImage: "house.fill")
                }

            PlaybookView()
                .tabItem {
                    Label("Playbook", systemImage: "book.pages.fill")
                }

            ProfileView()
                .tabItem {
                    Label("Profile", systemImage: "person.fill")
                }
        }
        .tint(Color.pbGreen)
        .sheet(isPresented: $showAddClip) {
            AddClipView(prefillURL: nil) {
                showAddClip = false
            }
        }
    }
}
