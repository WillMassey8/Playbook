import Foundation
import Observation

@Observable
final class ReelViewModel {
    /// Signed URLs for coach-owned uploads only (never third-party social downloads).
    var signedURLs: [UUID: URL] = [:]
    /// Temporary X CDN streams for muted AVPlayer autoplay (session-only, not stored).
    var streamURLs: [UUID: URL] = [:]
    /// Official embed URLs for TikTok / Instagram / Facebook (and X fallback).
    var embedURLs: [UUID: URL] = [:]
    /// Plays whose playback failed or is unavailable.
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
    func resolvePlayback(for play: Play) async {
        guard !unavailableIDs.contains(play.id) else { return }

        // X: resolve a temporary stream so AVPlayer can muted-autoplay (no play tap).
        if play.sourcePlatform == .twitter, streamURLs[play.id] == nil {
            if let stream = await PlaybackResolver.twitterStreamURL(sourceURL: play.sourceUrl) {
                streamURLs[play.id] = stream
            }
        }

        if embedURLs[play.id] == nil, let embed = PlaybackResolver.embedURL(for: play) {
            embedURLs[play.id] = embed
        }
    }

    @MainActor
    func markUnavailable(_ play: Play) {
        unavailableIDs.insert(play.id)
        streamURLs[play.id] = nil
        embedURLs[play.id] = nil
    }

    func ownedVideoURL(for play: Play) -> URL? {
        signedURLs[play.id]
    }

    /// Prefer temporary X stream for seamless muted autoplay.
    func streamURL(for play: Play) -> URL? {
        guard !unavailableIDs.contains(play.id) else { return nil }
        return streamURLs[play.id]
    }

    func embedURL(for play: Play) -> URL? {
        guard !unavailableIDs.contains(play.id) else { return nil }
        // If we already have a native stream, skip the embed player.
        if streamURLs[play.id] != nil { return nil }
        return embedURLs[play.id]
    }

    func canPlayInApp(_ play: Play) -> Bool {
        ownedVideoURL(for: play) != nil
            || streamURL(for: play) != nil
            || embedURL(for: play) != nil
            || (play.sourcePlatform == .twitter && !unavailableIDs.contains(play.id))
    }
}
