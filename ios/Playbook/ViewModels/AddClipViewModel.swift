import Foundation
import Observation

enum AddClipState: Equatable {
    case idle
    case loading
    case success(Play)
    case failure(String)
}

@Observable
final class AddClipViewModel {
    var urlText = ""
    var selectedCategoryId: UUID?
    var state: AddClipState = .idle

    var isLoading: Bool { state == .loading }
    var isValid: Bool {
        guard !urlText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
              let url = URL(string: urlText.trimmingCharacters(in: .whitespacesAndNewlines)),
              url.scheme?.hasPrefix("http") == true else { return false }
        return selectedCategoryId != nil
    }

    private let service = SupabaseService.shared

    @MainActor
    func submit() async {
        guard isValid else { return }
        let raw = urlText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let url = URL(string: raw) else { return }

        state = .loading
        do {
            let response = try await service.ingestSharedURL(url, categoryId: selectedCategoryId)
            if let play = response.play {
                state = .success(play)
            } else {
                state = .failure(response.message ?? "Something went wrong. The link was saved.")
            }
        } catch {
            state = .failure(error.localizedDescription)
        }
    }

    func reset() {
        urlText = ""
        selectedCategoryId = nil
        state = .idle
    }
}
