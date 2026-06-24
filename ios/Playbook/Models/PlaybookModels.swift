import Foundation

enum PlayStatus: String, Codable, Sendable {
    case pending
    case processing
    case ready
    case failed
}

enum SourcePlatform: String, Codable, Sendable {
    case twitter
    case instagram
    case unknown
}

struct Category: Identifiable, Codable, Hashable, Sendable {
    let id: UUID
    let userId: UUID
    let parentId: UUID?
    let name: String
    let slug: String
    let sortOrder: Int
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case parentId = "parent_id"
        case name
        case slug
        case sortOrder = "sort_order"
        case createdAt = "created_at"
    }
}

struct Play: Identifiable, Codable, Hashable, Sendable {
    let id: UUID
    let userId: UUID
    let categoryId: UUID?
    let sourceUrl: String
    let sourcePlatform: SourcePlatform
    let title: String?
    let thumbnailUrl: String?
    let embedUrl: String?
    let videoStoragePath: String?
    let thumbnailStoragePath: String?
    let durationSeconds: Double?
    let status: PlayStatus
    let errorMessage: String?
    let createdAt: Date
    let updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case categoryId = "category_id"
        case sourceUrl = "source_url"
        case sourcePlatform = "source_platform"
        case title
        case thumbnailUrl = "thumbnail_url"
        case embedUrl = "embed_url"
        case videoStoragePath = "video_storage_path"
        case thumbnailStoragePath = "thumbnail_storage_path"
        case durationSeconds = "duration_seconds"
        case status
        case errorMessage = "error_message"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

struct IngestPlayRequest: Encodable, Sendable {
    let sourceUrl: String
    let categoryId: UUID?
    let title: String?

    enum CodingKeys: String, CodingKey {
        case sourceUrl = "source_url"
        case categoryId = "category_id"
        case title
    }
}

struct IngestPlayResponse: Decodable, Sendable {
    let play: Play?
    let playId: UUID?
    let status: PlayStatus?
    let message: String?

    enum CodingKeys: String, CodingKey {
        case play
        case playId = "play_id"
        case status
        case message
    }
}
