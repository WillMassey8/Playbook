import Foundation
import Supabase

@MainActor
final class SupabaseService: ObservableObject {
    static let shared = SupabaseService()

    let client: SupabaseClient

    @Published private(set) var session: Session?
    @Published private(set) var isLoading = false

    private init() {
        client = SupabaseClient(
            supabaseURL: AppConfig.supabaseURL,
            supabaseKey: AppConfig.supabaseAnonKey
        )

        Task {
            await refreshSession()
            await listenForAuthChanges()
        }
    }

    func refreshSession() async {
        session = try? await client.auth.session
    }

    private func listenForAuthChanges() async {
        for await (_, session) in client.auth.authStateChanges {
            self.session = session
            // Make the access token available to the Share Extension via App Group.
            if let token = session?.accessToken {
                SharedURLStore.saveUserToken(token)
            } else {
                SharedURLStore.clearUserToken()
            }
        }
    }

    func signIn(email: String, password: String) async throws {
        isLoading = true
        defer { isLoading = false }
        try await client.auth.signIn(email: email, password: password)
    }

    func signUp(email: String, password: String) async throws {
        isLoading = true
        defer { isLoading = false }
        try await client.auth.signUp(email: email, password: password)
    }

    func signOut() async throws {
        try await client.auth.signOut()
    }

    func fetchCategories() async throws -> [Category] {
        try await client
            .from("categories")
            .select()
            .order("sort_order")
            .execute()
            .value
    }

    func fetchPlays(categoryId: UUID? = nil) async throws -> [Play] {
        var query = client
            .from("plays")
            .select()
            .order("created_at", ascending: false)

        if let categoryId {
            query = query.eq("category_id", value: categoryId.uuidString)
        }

        return try await query.execute().value
    }

    func ingestSharedURL(_ url: URL, categoryId: UUID?) async throws -> IngestPlayResponse {
        let request = IngestPlayRequest(
            sourceUrl: url.absoluteString,
            categoryId: categoryId,
            title: nil
        )

        return try await client.functions.invoke(
            "ingest-shared-url",
            options: FunctionInvokeOptions(body: request)
        )
    }

    func deletePlay(_ play: Play) async throws {
        try await client
            .from("plays")
            .delete()
            .eq("id", value: play.id.uuidString)
            .execute()
    }

    func signedVideoURL(for play: Play) async throws -> URL? {
        guard let path = play.videoStoragePath else { return nil }

        let signed = try await client.storage
            .from(AppConstants.playVideosBucket)
            .createSignedURL(path: path, expiresIn: 3600)

        return signed
    }
}
