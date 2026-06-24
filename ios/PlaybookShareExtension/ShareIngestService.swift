import Foundation

// Lightweight Supabase client for the Share Extension.
// Uses plain URLSession so the extension stays small and avoids SDK linking issues.
enum ShareIngestService {

    // Pull these from the extension's Info.plist (same keys the main app uses).
    private static var supabaseURL: String {
        Bundle.main.object(forInfoDictionaryKey: "SUPABASE_URL") as? String ?? ""
    }
    private static var anonKey: String {
        Bundle.main.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as? String ?? ""
    }

    // MARK: - Types

    struct ShareCategory: Identifiable, Decodable {
        let id: String
        let parentId: String?
        let name: String
        let sortOrder: Int

        enum CodingKeys: String, CodingKey {
            case id, name
            case parentId    = "parent_id"
            case sortOrder   = "sort_order"
        }
    }

    enum IngestError: Error, LocalizedError {
        case notLoggedIn
        case networkError(String)
        case serverError(Int, String)

        var errorDescription: String? {
            switch self {
            case .notLoggedIn:         return "You must open Playbook AI and sign in first."
            case .networkError(let m): return m
            case .serverError(let c, let m): return "Server error \(c): \(m)"
            }
        }
    }

    // MARK: - Fetch categories

    static func fetchCategories(jwt: String) async throws -> [ShareCategory] {
        guard let url = URL(string: "\(supabaseURL)/rest/v1/categories?select=*&order=sort_order") else {
            throw IngestError.networkError("Invalid Supabase URL")
        }

        var req = URLRequest(url: url)
        req.setValue("Bearer \(jwt)", forHTTPHeaderField: "Authorization")
        req.setValue(anonKey, forHTTPHeaderField: "apikey")

        let (data, response) = try await URLSession.shared.data(for: req)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(status) else {
            let body = String(data: data, encoding: .utf8) ?? ""
            throw IngestError.serverError(status, body)
        }

        let decoder = JSONDecoder()
        return try decoder.decode([ShareCategory].self, from: data)
    }

    // MARK: - Ingest shared URL

    struct IngestResult: Decodable {
        let playId: String?
        let status: String?

        enum CodingKeys: String, CodingKey {
            case status
            case playId = "play_id"
        }
    }

    static func ingest(
        jwt: String,
        sourceURL: String,
        categoryId: String?,
        title: String? = nil
    ) async throws -> IngestResult {
        guard let url = URL(string: "\(supabaseURL)/functions/v1/ingest-shared-url") else {
            throw IngestError.networkError("Invalid function URL")
        }

        var body: [String: Any] = ["source_url": sourceURL]
        if let cid = categoryId { body["category_id"] = cid }
        if let t = title       { body["title"] = t }

        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("Bearer \(jwt)", forHTTPHeaderField: "Authorization")
        req.setValue(anonKey, forHTTPHeaderField: "apikey")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: req)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(status) else {
            let msg = (try? JSONDecoder().decode([String: String].self, from: data))?["error"]
                ?? String(data: data, encoding: .utf8) ?? "Unknown error"
            throw IngestError.serverError(status, msg)
        }

        // The edge function wraps the play inside { "play": { ... } }
        if let wrapper = try? JSONDecoder().decode([String: IngestResult].self, from: data),
           let play = wrapper["play"] {
            return play
        }
        return (try? JSONDecoder().decode(IngestResult.self, from: data)) ?? IngestResult(playId: nil, status: "processing")
    }
}
