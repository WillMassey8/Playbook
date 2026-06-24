import Foundation
import Observation
import Supabase

@Observable
final class HomeViewModel {
    var plays: [Play] = []
    var isLoading = false
    var error: String?

    var readyPlays: [Play] { plays.filter { $0.status == .ready } }
    var processingPlays: [Play] { plays.filter { $0.status == .processing || $0.status == .pending } }

    private let service = SupabaseService.shared
    private var realtimeTask: Task<Void, Never>?

    @MainActor
    func load() async {
        guard !isLoading else { return }
        isLoading = true
        error = nil
        defer { isLoading = false }
        do {
            plays = try await service.fetchPlays()
        } catch {
            self.error = error.localizedDescription
        }
        startRealtime()
    }

    @MainActor
    func refresh() async {
        isLoading = false
        await load()
    }

    @MainActor
    func deletePlay(_ play: Play) async {
        plays.removeAll { $0.id == play.id }
        try? await service.deletePlay(play)
    }

    // MARK: - Realtime (auto-refresh when a new play is ready)

    private func startRealtime() {
        realtimeTask?.cancel()
        realtimeTask = Task { [weak self] in
            guard let self else { return }
            let channel = service.client
                .realtimeV2
                .channel("plays-feed")
            await channel.on("postgres_changes", filter: ChannelFilter(
                event: "*",
                schema: "public",
                table: "plays"
            )) { [weak self] _ in
                Task { @MainActor [weak self] in
                    guard let self else { return }
                    // Re-fetch quietly (no loading spinner)
                    if let fresh = try? await self.service.fetchPlays() {
                        self.plays = fresh
                    }
                }
            }
            await channel.subscribe()
        }
    }

    deinit {
        realtimeTask?.cancel()
    }
}
