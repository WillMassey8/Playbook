import Foundation
import Observation

@Observable
final class ReelViewModel {
    /// Signed URLs for coach-owned uploads only (never third-party social downloads).
    var signedURLs: [UUID: URL] = [:]
    /// Official embed URLs for social platforms.
    var embedURLs: [UUID: URL] = [:]
    /// Plays whose embed failed or is unavailable.
    var unavailableIDs: Set<UUID> = []
    var isLoadingURLs = false

    private let service = SupabaseService.shared

    @MainActor
    func loadSignedURLs(for plays: [Play]) async {
        guard !isLoadingURLs else { return }
        isLoadingURLs = true
        defer { isLoadingURLs = false }

        var result: [UUID: URL] = [:]
        await withTaskGroup(of: (UUID, URL?).self) { group in
            for play in plays where play.status == .ready && play.videoStoragePath != nil {
                group.addTask {
                    let url = try? await self.service.signedVideoURL(for: play)
                    return (play.id, url)
                }
            }
            for await (id, url) in group {
                if let url { result[id] = url }
            }
        }
        signedURLs = result
    }

    @MainActor
    func resolveEmbed(for play: Play) {
        guard embedURLs[play.id] == nil else { return }
        if let url = PlaybackResolver.embedURL(for: play) {
            embedURLs[play.id] = url
        }
    }

    @MainActor
    func markUnavailable(_ play: Play) {
        unavailableIDs.insert(play.id)
    }

    func ownedVideoURL(for play: Play) -> URL? {
        signedURLs[play.id]
    }

    func embedURL(for play: Play) -> URL? {
        guard !unavailableIDs.contains(play.id) else { return nil }
        return embedURLs[play.id]
    }

    func canPlayInApp(_ play: Play) -> Bool {
        ownedVideoURL(for: play) != nil || embedURL(for: play) != nil
    }
}
