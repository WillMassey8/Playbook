import SwiftUI

struct HomeView: View {
    @State private var vm = HomeViewModel()
    @State private var showAddClip = false
    @State private var selectedPlay: Play?
    @Binding var showAdd: Bool

    private let columns = [
        GridItem(.flexible(), spacing: Spacing.sm),
        GridItem(.flexible(), spacing: Spacing.sm),
        GridItem(.flexible(), spacing: Spacing.sm),
    ]

    var body: some View {
        NavigationStack {
            ZStack {
                Color.pbBg.ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: 0) {
                        headerSection
                        clipsSection
                    }
                }
                .refreshable { await vm.refresh() }
            }
            .navigationBarHidden(true)
            .task { await vm.load() }
            .sheet(item: $selectedPlay) { play in
                PlayReelView(plays: vm.readyPlays, startingAt: play)
            }
        }
    }

    // MARK: - Header

    private var headerSection: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text("Playbook")
                    .font(.pbLargeTitle)
                    .foregroundStyle(.white)
                Text("Your film library")
                    .font(.pbCallout)
                    .foregroundStyle(.white.opacity(0.45))
            }
            Spacer()
            Button {
                showAdd = true
            } label: {
                Image(systemName: "plus")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(.black)
                    .frame(width: 40, height: 40)
                    .background(Color.pbGreen)
                    .clipShape(Circle())
            }
        }
        .padding(.horizontal, Spacing.md)
        .padding(.top, Spacing.lg)
        .padding(.bottom, Spacing.md)
    }

    // MARK: - Clips grid

    @ViewBuilder
    private var clipsSection: some View {
        if vm.isLoading && vm.plays.isEmpty {
            skeletonGrid
        } else if let error = vm.error {
            errorView(error)
        } else if vm.plays.isEmpty {
            emptyState
        } else {
            VStack(alignment: .leading, spacing: Spacing.md) {
                if !vm.processingPlays.isEmpty {
                    processingBanner
                }
                if !vm.readyPlays.isEmpty {
                    recentSection
                }
            }
        }
    }

    private var processingBanner: some View {
        HStack(spacing: Spacing.sm) {
            ProgressView()
                .scaleEffect(0.75)
                .tint(Color.pbGreen)
            Text("\(vm.processingPlays.count) clip\(vm.processingPlays.count == 1 ? "" : "s") processing…")
                .font(.pbCallout)
                .foregroundStyle(.white.opacity(0.7))
            Spacer()
        }
        .padding(.horizontal, Spacing.md)
        .padding(.vertical, Spacing.sm)
        .background(Color.pbGreen.opacity(0.08))
    }

    private var recentSection: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Text("Recent clips")
                .font(.pbHeadline)
                .foregroundStyle(.white.opacity(0.6))
                .padding(.horizontal, Spacing.md)

            LazyVGrid(columns: columns, spacing: Spacing.sm) {
                ForEach(vm.readyPlays) { play in
                    Button {
                        selectedPlay = play
                    } label: {
                        PlayCard(play: play)
                    }
                    .buttonStyle(.plain)
                    .contextMenu {
                        Button(role: .destructive) {
                            Task { await vm.deletePlay(play) }
                        } label: {
                            Label("Delete", systemImage: "trash")
                        }
                    }
                }
            }
            .padding(.horizontal, Spacing.md)
        }
    }

    private var skeletonGrid: some View {
        LazyVGrid(columns: columns, spacing: Spacing.sm) {
            ForEach(0..<9, id: \.self) { _ in PlayCardSkeleton() }
        }
        .padding(.horizontal, Spacing.md)
    }

    private var emptyState: some View {
        VStack(spacing: Spacing.md) {
            Image(systemName: "film.stack")
                .font(.system(size: 48))
                .foregroundStyle(Color.pbGreen.opacity(0.6))
            Text("No clips yet")
                .font(.pbTitle2)
                .foregroundStyle(.white)
            Text("Share a play from Twitter/X or Instagram,\nor tap + to paste a link.")
                .font(.pbCallout)
                .foregroundStyle(.white.opacity(0.45))
                .multilineTextAlignment(.center)
            Button("Add a Clip") { showAdd = true }
                .buttonStyle(PBButtonStyle())
                .frame(width: 180)
        }
        .padding(.top, Spacing.xxl)
        .padding(.horizontal, Spacing.xl)
    }

    private func errorView(_ message: String) -> some View {
        VStack(spacing: Spacing.md) {
            Image(systemName: "wifi.exclamationmark")
                .font(.system(size: 40))
                .foregroundStyle(.red.opacity(0.7))
            Text(message)
                .font(.pbCallout)
                .foregroundStyle(.white.opacity(0.6))
                .multilineTextAlignment(.center)
            Button("Retry") { Task { await vm.refresh() } }
                .buttonStyle(SecondaryButtonStyle())
                .frame(width: 140)
        }
        .padding(.top, Spacing.xxl)
        .padding(.horizontal, Spacing.xl)
    }
}
