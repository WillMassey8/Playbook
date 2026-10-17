import SwiftUI

/// Full-screen first thing after sharing: play the clip, then categorize into the playbook.
struct SharedClipIntakeView: View {
    let sourceURL: URL
    var onDone: () -> Void
    var onSkip: () -> Void

    @State private var categories: [Category] = []
    @State private var selectedCategoryId: UUID?
    @State private var isSaving = false
    @State private var errorMessage: String?
    @State private var play: Play?
    @State private var embedURL: URL?

    private var leafCategories: [Category] {
        let parentIDs = Set(categories.compactMap(\.parentId))
        return categories
            .filter { !parentIDs.contains($0.id) }
            .sorted { $0.sortOrder < $1.sortOrder }
    }

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            // Video / embed plane
            Group {
                if let embedURL {
                    EmbedPlayerView(embedURL: embedURL, isActive: true)
                } else if let stream = play.flatMap({ PlaybackResolver.embedURL(for: $0) }) {
                    EmbedPlayerView(embedURL: stream, isActive: true)
                } else {
                    ProgressView()
                        .tint(.white)
                }
            }
            .ignoresSafeArea()

            // Bottom categorize sheet
            VStack(spacing: 0) {
                Spacer()

                VStack(alignment: .leading, spacing: Spacing.md) {
                    Text("Save to your playbook")
                        .font(.pbTitle2)
                        .foregroundStyle(.white)

                    Text(sourceURL.host ?? "Shared clip")
                        .font(.pbCaption)
                        .foregroundStyle(.white.opacity(0.45))
                        .lineLimit(1)

                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(leafCategories) { cat in
                                categoryChip(cat)
                            }
                        }
                    }

                    if let errorMessage {
                        Text(errorMessage)
                            .font(.pbCaption)
                            .foregroundStyle(.orange)
                    }

                    HStack(spacing: Spacing.sm) {
                        Button("Later") { onSkip() }
                            .buttonStyle(SecondaryButtonStyle())

                        Button {
                            Task { await save() }
                        } label: {
                            if isSaving {
                                ProgressView().tint(.black)
                            } else {
                                Text("Save to Playbook")
                            }
                        }
                        .buttonStyle(PBButtonStyle())
                        .disabled(selectedCategoryId == nil || isSaving)
                        .opacity(selectedCategoryId == nil ? 0.45 : 1)
                    }
                }
                .padding(Spacing.lg)
                .padding(.bottom, Spacing.xl)
                .background(
                    LinearGradient(
                        colors: [.clear, .black.opacity(0.92), .black],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )
            }
        }
        .task {
            embedURL = PlaybackResolver.officialEmbedURL(from: sourceURL.absoluteString)
            categories = (try? await SupabaseService.shared.fetchCategories()) ?? []
            // Best-effort: create the play row now (uncategorized) so it persists.
            if play == nil {
                play = try? await SupabaseService.shared.ingestSharedURL(sourceURL, categoryId: nil).play
                if let play, let e = PlaybackResolver.embedURL(for: play) {
                    embedURL = e
                }
            }
        }
        .preferredColorScheme(.dark)
    }

    private func categoryChip(_ category: Category) -> some View {
        let selected = selectedCategoryId == category.id
        return Button {
            selectedCategoryId = category.id
        } label: {
            Text(category.name)
                .font(.pbCaptionBold)
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .foregroundStyle(selected ? .black : .white.opacity(0.85))
                .background(selected ? Color.pbGreen : Color.white.opacity(0.1))
                .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }

    @MainActor
    private func save() async {
        guard let categoryId = selectedCategoryId else { return }
        isSaving = true
        errorMessage = nil
        defer { isSaving = false }
        do {
            // Re-ingest with category (creates/updates play for this user).
            _ = try await SupabaseService.shared.ingestSharedURL(sourceURL, categoryId: categoryId)
            onDone()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
