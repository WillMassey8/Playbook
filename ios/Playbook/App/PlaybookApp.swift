import SwiftUI

@main
struct PlaybookApp: App {
    @StateObject private var supabase = SupabaseService.shared
    @State private var pendingSharedURL: URL?
    @State private var showAddClip = false

    var body: some Scene {
        WindowGroup {
            RootView(
                pendingSharedURL: $pendingSharedURL,
                showAddClip: $showAddClip
            )
            .environmentObject(supabase)
            .preferredColorScheme(.dark)
            .onOpenURL { url in
                // Called when share extension writes to App Group and opens playbook://share
                if url.scheme == "playbook", url.host == "share" {
                    if let pending = SharedURLStore.consumePendingURL() {
                        pendingSharedURL = pending
                        showAddClip = true
                    }
                }
            }
            .onAppear {
                // Pick up any URL stored before the app was launched
                if let pending = SharedURLStore.consumePendingURL() {
                    pendingSharedURL = pending
                    showAddClip = true
                }
            }
        }
    }
}

// MARK: - Root

struct RootView: View {
    @Binding var pendingSharedURL: URL?
    @Binding var showAddClip: Bool
    @EnvironmentObject private var supabase: SupabaseService

    var body: some View {
        Group {
            if supabase.session == nil {
                AuthLandingView()
            } else {
                MainTabView(showAddClip: $showAddClip, pendingSharedURL: $pendingSharedURL)
            }
        }
        .animation(.easeInOut(duration: 0.3), value: supabase.session == nil)
    }
}

// MARK: - Main tab view

struct MainTabView: View {
    @Binding var showAddClip: Bool
    @Binding var pendingSharedURL: URL?

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
        .sheet(isPresented: $showAddClip, onDismiss: { pendingSharedURL = nil }) {
            AddClipView(prefillURL: pendingSharedURL) {
                pendingSharedURL = nil
            }
        }
    }
}
