import Foundation
import Observation

@Observable
final class PlaybookViewModel {
    var categories: [Category] = []
    var plays: [Play] = []
    var isLoading = false
    var error: String?

    var topLevelCategories: [Category] {
        categories.filter { $0.parentId == nil }
            .sorted { $0.sortOrder < $1.sortOrder }
    }

    private let service = SupabaseService.shared

    @MainActor
    func load() async {
        guard !isLoading else { return }
        isLoading = true
        error = nil
        defer { isLoading = false }
        do {
            async let cats = service.fetchCategories()
            async let plys = service.fetchPlays()
            categories = try await cats
            plays = try await plys
        } catch {
            self.error = error.localizedDescription
        }
    }

    @MainActor
    func refresh() async {
        isLoading = false
        await load()
    }

    func children(of category: Category) -> [Category] {
        categories.filter { $0.parentId == category.id }
            .sorted { $0.sortOrder < $1.sortOrder }
    }

    func plays(in category: Category) -> [Play] {
        let ids = descendantIDs(of: category)
        return plays.filter { play in
            guard let cid = play.categoryId else { return false }
            return ids.contains(cid)
        }
        .sorted { $0.createdAt > $1.createdAt }
    }

    func readyPlays(in category: Category) -> [Play] {
        plays(in: category).filter { $0.status == .ready }
    }

    func playCount(for category: Category) -> Int {
        plays(in: category).count
    }

    private func descendantIDs(of category: Category) -> Set<UUID> {
        var ids: Set<UUID> = [category.id]
        for child in children(of: category) {
            ids.formUnion(descendantIDs(of: child))
        }
        return ids
    }
}
