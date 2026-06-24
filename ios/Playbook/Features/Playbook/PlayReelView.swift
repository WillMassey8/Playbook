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
                await vm.resolveStream(for: play)
            }
        }
        .onChange(of: currentIndex) { _, newIndex in
            guard plays.indices.contains(newIndex) else { return }
            Task { await vm.resolveStream(for: plays[newIndex]) }
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

            if isActive, let url = vm.playbackURL(for: play) {
                LoopingVideoPlayer(url: url)
                    .ignoresSafeArea()
            } else if play.sourcePlatform == .twitter && isActive && vm.playbackURL(for: play) == nil {
                ProgressView()
                    .tint(.white)
            } else if play.videoStoragePath == nil && play.sourcePlatform != .twitter {
                openSourcePrompt(for: play)
            } else if !isActive {
                Color.clear
            } else {
                placeholderContent(for: play)
            }

            // Bottom info overlay
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

                    Link(destination: URL(string: play.sourceUrl)!) {
                        Label("Source", systemImage: "arrow.up.right.square")
                            .font(.pbCaptionBold)
                            .foregroundStyle(.white.opacity(0.7))
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
            Text("Watch on the original platform")
                .font(.pbCallout)
                .foregroundStyle(.white.opacity(0.6))
            Link(destination: URL(string: play.sourceUrl)!) {
                Label("Open Source", systemImage: "arrow.up.right.square")
                    .font(.pbCaptionBold)
            }
            .foregroundStyle(Color.pbGreen)
        }
        .padding(.horizontal, Spacing.xl)
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
