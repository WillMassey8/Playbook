import Foundation
import Observation

enum AuthMode { case signIn, signUp }

@Observable
final class AuthViewModel {
    var email = ""
    var password = ""
    var mode: AuthMode = .signIn
    var isLoading = false
    var errorMessage: String?

    var isValid: Bool {
        !email.trimmingCharacters(in: .whitespaces).isEmpty &&
        password.count >= 6
    }

    private let service = SupabaseService.shared

    @MainActor
    func submit() async {
        guard isValid else { return }
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            switch mode {
            case .signIn:
                try await service.signIn(email: email, password: password)
            case .signUp:
                try await service.signUp(email: email, password: password)
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    @MainActor
    func signOut() async {
        try? await service.signOut()
    }
}
