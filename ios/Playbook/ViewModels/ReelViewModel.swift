import Foundation
import Observation

@Observable
final class ReelViewModel {
    var signedURLs: [UUID: URL] = [:]
    var streamURLs: [UUID: URL] = [:]
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
    func resolveStream(for play: Play) async {
        guard streamURLs[play.id] == nil else { return }
        guard play.sourcePlatform == .twitter else { return }

        if let url = await PlaybackResolver.twitterStreamURL(sourceURL: play.sourceUrl) {
            streamURLs[play.id] = url
        }
    }

    func playbackURL(for play: Play) -> URL? {
        signedURLs[play.id] ?? streamURLs[play.id]
    }
}
