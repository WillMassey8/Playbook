import SwiftUI
import AVKit

struct PlayReelView: View {
    let plays: [Play]
    var startingAt: Play? = nil

    @State private var vm = ReelViewModel()
    @State private var currentIndex = 0
    @State private var showOverlay = true
    @Environment(\.dismiss) private var dismiss

    private var current: Play? { plays.indices.contains(currentIndex) ? plays[currentIndex] : nil }

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            if plays.isEmpty {
                Text("No clips to show")
                    .foregroundStyle(.white.opacity(0.5))
            } else {
                reelPager
            }
        }
        .ignoresSafeArea()
        .preferredColorScheme(.dark)
        .task {
            await vm.loadSignedURLs(for: plays)
            if let start = startingAt, let idx = plays.firstIndex(where: { $0.id == start.id }) {
                currentIndex = idx
            }
            if let play = current {
                await vm.resolvePlayback(for: play)
            }
            // Warm the next clip for instant swipe autoplay.
            let next = currentIndex + 1
            if plays.indices.contains(next) {
                await vm.resolvePlayback(for: plays[next])
            }
        }
        .onChange(of: currentIndex) { _, newIndex in
            guard plays.indices.contains(newIndex) else { return }
            Task {
                await vm.resolvePlayback(for: plays[newIndex])
                let next = newIndex + 1
                if plays.indices.contains(next) {
                    await vm.resolvePlayback(for: plays[next])
                }
            }
        }
    }

    // MARK: - Pager

    private var reelPager: some View {
        TabView(selection: $currentIndex) {
            ForEach(Array(plays.enumerated()), id: \.element.id) { index, play in
                reelPage(for: play, isActive: index == currentIndex)
                    .tag(index)
                    .onTapGesture {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            showOverlay.toggle()
                        }
                    }
            }
        }
        .tabViewStyle(.page(indexDisplayMode: .never))
        .ignoresSafeArea()
        .overlay(alignment: .topLeading) {
            if showOverlay { dismissButton }
        }
        .overlay(alignment: .bottom) {
            if showOverlay { pageIndicator }
        }
    }

    // MARK: - Single reel page

    @ViewBuilder
    private func reelPage(for play: Play, isActive: Bool) -> some View {
        ZStack {
            Color.black

            thumbnailBackdrop(for: play)

            if let owned = vm.ownedVideoURL(for: play), isActive {
                // Coach-owned uploads — muted looping autoplay.
                LoopingVideoPlayer(url: owned)
                    .ignoresSafeArea()
            } else if let stream = vm.streamURL(for: play), isActive {
                // X temporary CDN stream — muted looping autoplay, not stored.
                LoopingVideoPlayer(url: stream)
                    .ignoresSafeArea()
            } else if let embed = vm.embedURL(for: play), isActive {
                // TikTok / IG / FB (and X fallback) — official embed with autoplay kick.
                EmbedPlayerView(
                    embedURL: embed,
                    isActive: isActive,
                    onUnavailable: { vm.markUnavailable(play) }
                )
                .ignoresSafeArea()
            } else if isActive && play.sourcePlatform == .twitter && vm.streamURL(for: play) == nil
                        && vm.embedURL(for: play) == nil
                        && !vm.unavailableIDs.contains(play.id) {
                ProgressView()
                    .tint(.white)
            } else if isActive && play.status == .ready && !vm.canPlayInApp(play) {
                openSourcePrompt(for: play)
            } else if !isActive {
                Color.clear
            } else {
                placeholderContent(for: play)
            }

            if showOverlay {
                infoOverlay(for: play)
            }
        }
        .ignoresSafeArea()
    }

    // MARK: - Info overlay

    private func infoOverlay(for play: Play) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Spacer()
            VStack(alignment: .leading, spacing: Spacing.sm) {
                if let title = play.title, !title.isEmpty {
                    Text(title)
                        .font(.pbTitle2)
                        .foregroundStyle(.white)
                        .shadow(radius: 4)
                }

                HStack(spacing: Spacing.sm) {
                    PlatformBadge(platform: play.sourcePlatform)

                    if let source = URL(string: play.sourceUrl) {
                        Link(destination: source) {
                            Label("Source", systemImage: "arrow.up.right.square")
                                .font(.pbCaptionBold)
                                .foregroundStyle(.white.opacity(0.7))
                        }
                    }

                    Spacer()

                    Text(play.createdAt, style: .relative)
                        .font(.pbCaption)
                        .foregroundStyle(.white.opacity(0.4))
                }
            }
            .padding(.horizontal, Spacing.md)
            .padding(.bottom, Spacing.xxl)
            .background(
                LinearGradient(
                    colors: [.clear, .black.opacity(0.8)],
                    startPoint: .top,
                    endPoint: .bottom
                )
            )
        }
        .ignoresSafeArea(edges: .bottom)
        // Let taps reach the video; only the Source link stays tappable.
        .allowsHitTesting(showOverlay)
    }

    @ViewBuilder
    private func thumbnailBackdrop(for play: Play) -> some View {
        if let thumb = play.thumbnailUrl, let url = URL(string: thumb) {
            AsyncImage(url: url) { phase in
                switch phase {
                case .success(let image):
                    image.resizable().scaledToFill()
                default:
                    Color(red: 0.12, green: 0.12, blue: 0.14)
                }
            }
            .ignoresSafeArea()
        }
    }

    @ViewBuilder
    private func openSourcePrompt(for play: Play) -> some View {
        VStack(spacing: Spacing.md) {
            Image(systemName: "play.rectangle")
                .font(.system(size: 44))
                .foregroundStyle(.white.opacity(0.7))
            Text(unavailableMessage(for: play))
                .font(.pbCallout)
                .foregroundStyle(.white.opacity(0.6))
                .multilineTextAlignment(.center)
            if let source = URL(string: play.sourceUrl) {
                Link(destination: source) {
                    Label(openLabel(for: play.sourcePlatform), systemImage: "arrow.up.right.square")
                        .font(.pbCaptionBold)
                }
                .foregroundStyle(Color.pbGreen)
            }
        }
        .padding(.horizontal, Spacing.xl)
    }

    private func unavailableMessage(for play: Play) -> String {
        if vm.unavailableIDs.contains(play.id) {
            return "This clip is private, deleted, or unavailable in-app."
        }
        return "Watch on the original platform"
    }

    private func openLabel(for platform: SourcePlatform) -> String {
        switch platform {
        case .twitter:   return "Open on X"
        case .instagram: return "Open in Instagram"
        case .tiktok:    return "Open in TikTok"
        case .facebook:  return "Open in Facebook"
        case .unknown:   return "Open Source"
        }
    }

    // MARK: - Placeholder states

    @ViewBuilder
    private func placeholderContent(for play: Play) -> some View {
        switch play.status {
        case .ready:
            ProgressView("Loading video…")
                .tint(.white)
                .foregroundStyle(.white)
        case .processing, .pending:
            VStack(spacing: Spacing.md) {
                ProgressView()
                    .scaleEffect(1.4)
                    .tint(Color.pbGreen)
                Text("Processing clip…")
                    .font(.pbCallout)
                    .foregroundStyle(.white.opacity(0.6))
            }
        case .failed:
            VStack(spacing: Spacing.md) {
                Image(systemName: "exclamationmark.triangle")
                    .font(.system(size: 40))
                    .foregroundStyle(.red.opacity(0.7))
                Text(play.errorMessage ?? "Could not load video")
                    .font(.pbCallout)
                    .foregroundStyle(.white.opacity(0.6))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, Spacing.xl)
            }
        }
    }

    // MARK: - Controls

    private var dismissButton: some View {
        Button { dismiss() } label: {
            Image(systemName: "xmark")
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(.white)
                .frame(width: 36, height: 36)
                .background(.ultraThinMaterial, in: Circle())
        }
        .padding(.top, 56)
        .padding(.leading, Spacing.md)
    }

    private var pageIndicator: some View {
        HStack(spacing: 5) {
            ForEach(plays.indices, id: \.self) { i in
                Capsule()
                    .fill(i == currentIndex ? Color.white : Color.white.opacity(0.3))
                    .frame(width: i == currentIndex ? 20 : 6, height: 6)
                    .animation(.easeInOut(duration: 0.2), value: currentIndex)
            }
        }
        .padding(.bottom, 40)
    }
}
