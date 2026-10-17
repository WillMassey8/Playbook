import Foundation
import Observation
import AuthenticationServices
import CryptoKit

enum AuthMode { case signIn, signUp }

@Observable
final class AuthViewModel: NSObject {
    var email = ""
    var password = ""
    var mode: AuthMode = .signIn
    var isLoading = false
    var errorMessage: String?
    var appleNonce: String?

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

    @MainActor
    func deleteAccount() async {
        do {
            try await service.deleteAccount()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Sign in with Apple

    func prepareAppleSignIn() -> String {
        let nonce = randomNonce()
        appleNonce = nonce
        return sha256(nonce)
    }

    @MainActor
    func handleAppleSignIn(authorization: ASAuthorization) async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        guard
            let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
            let tokenData = credential.identityToken,
            let idToken = String(data: tokenData, encoding: .utf8),
            let nonce = appleNonce
        else {
            errorMessage = "Apple Sign In failed. Try again."
            return
        }

        do {
            try await service.signInWithApple(idToken: idToken, nonce: nonce)
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

// MARK: - Nonce helpers

private func randomNonce(length: Int = 32) -> String {
    precondition(length > 0)
    let charset = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
    var result = ""
    var remaining = length
    while remaining > 0 {
        let randoms: [UInt8] = (0..<16).map { _ in
            var random: UInt8 = 0
            _ = SecRandomCopyBytes(kSecRandomDefault, 1, &random)
            return random
        }
        for random in randoms {
            if remaining == 0 { continue }
            if random < charset.count {
                result.append(charset[Int(random)])
                remaining -= 1
            }
        }
    }
    return result
}

private func sha256(_ input: String) -> String {
    let data = Data(input.utf8)
    let hash = SHA256.hash(data: data)
    return hash.map { String(format: "%02x", $0) }.joined()
}
