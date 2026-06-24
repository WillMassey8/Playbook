import SwiftUI

/// Compact clip card used in grids and lists.
struct PlayCard: View {
    let play: Play
    var showCategory = false

    var body: some View {
        ZStack(alignment: .bottomLeading) {
            // Thumbnail or placeholder
            thumbnailBackground

            // Bottom gradient + info
            LinearGradient(
                colors: [.clear, .black.opacity(0.75)],
                startPoint: .center,
                endPoint: .bottom
            )

            VStack(alignment: .leading, spacing: 4) {
                Spacer()
                if let title = play.title, !title.isEmpty {
                    Text(title)
                        .font(.pbCaptionBold)
                        .lineLimit(2)
                        .foregroundStyle(.white)
                }

                HStack(spacing: 6) {
                    PlatformBadge(platform: play.sourcePlatform)
                    Spacer()
                    if play.status != .ready {
                        StatusBadge(status: play.status)
                    }
                }
            }
            .padding(10)

            // Play icon overlay for ready clips
            if play.status == .ready {
                Image(systemName: "play.fill")
                    .font(.system(size: 22, weight: .semibold))
                    .foregroundStyle(.white.opacity(0.85))
                    .padding(8)
                    .background(.ultraThinMaterial, in: Circle())
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .aspectRatio(9/16, contentMode: .fit)
        .clipShape(RoundedRectangle(cornerRadius: Radius.md))
    }

    @ViewBuilder
    private var thumbnailBackground: some View {
        if let thumb = play.thumbnailUrl, let url = URL(string: thumb) {
            AsyncImage(url: url) { phase in
                switch phase {
                case .success(let image):
                    image.resizable().scaledToFill()
                default:
                    fallbackBackground
                }
            }
        } else {
            fallbackBackground
        }
    }

    @ViewBuilder
    private var fallbackBackground: some View {
        if play.status == .ready || play.status == .processing {
            Color(red: 0.15, green: 0.15, blue: 0.18)
        } else {
            Color(red: 0.22, green: 0.10, blue: 0.10)
        }
    }
}

struct PlayCardSkeleton: View {
    var body: some View {
        RoundedRectangle(cornerRadius: Radius.md)
            .fill(Color.pbCard)
            .aspectRatio(9/16, contentMode: .fit)
            .shimmer()
    }
}
