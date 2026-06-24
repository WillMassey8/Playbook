import SwiftUI

struct PlaybookView: View {
    @State private var vm = PlaybookViewModel()

    var body: some View {
        NavigationStack {
            ZStack {
                Color.pbBg.ignoresSafeArea()

                Group {
                    if vm.isLoading && vm.categories.isEmpty {
                        categorySkeletons
                    } else if let error = vm.error {
                        ContentUnavailableView {
                            Label("Could not load", systemImage: "wifi.exclamationmark")
                        } description: {
                            Text(error)
                        } actions: {
                            Button("Retry") { Task { await vm.refresh() } }
                                .buttonStyle(SecondaryButtonStyle())
                                .frame(width: 140)
                        }
                    } else if vm.topLevelCategories.isEmpty {
                        ContentUnavailableView(
                            "Playbook is empty",
                            systemImage: "folder",
                            description: Text("Start sharing clips from Twitter/X or Instagram.")
                        )
                    } else {
                        categoryList
                    }
                }
            }
            .navigationTitle("Playbook")
            .navigationBarTitleDisplayMode(.large)
            .toolbarBackground(Color.pbBg, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .refreshable { await vm.refresh() }
            .task { await vm.load() }
        }
    }

    // MARK: - Category list

    private var categoryList: some View {
        ScrollView {
            LazyVStack(spacing: Spacing.sm) {
                ForEach(vm.topLevelCategories) { category in
                    NavigationLink {
                        CategoryDetailView(category: category, vm: vm)
                    } label: {
                        CategoryRow(
                            category: category,
                            children: vm.children(of: category),
                            playCount: vm.playCount(for: category),
                            previewPlays: Array(vm.readyPlays(in: category).prefix(3))
                        )
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(Spacing.md)
        }
    }

    // MARK: - Skeleton

    private var categorySkeletons: some View {
        ScrollView {
            LazyVStack(spacing: Spacing.sm) {
                ForEach(0..<6, id: \.self) { _ in
                    RoundedRectangle(cornerRadius: Radius.md)
                        .fill(Color.pbCard)
                        .frame(height: 96)
                        .shimmer()
                }
            }
            .padding(Spacing.md)
        }
    }
}

// MARK: - Category row card

struct CategoryRow: View {
    let category: Category
    let children: [Category]
    let playCount: Int
    let previewPlays: [Play]

    var body: some View {
        HStack(spacing: Spacing.md) {
            // Color accent bar
            RoundedRectangle(cornerRadius: 3)
                .fill(category.accentColor)
                .frame(width: 4, height: 56)

            VStack(alignment: .leading, spacing: 4) {
                Text(category.name)
                    .font(.pbTitle2)
                    .foregroundStyle(.white)

                HStack(spacing: Spacing.xs) {
                    Text("\(playCount) clip\(playCount == 1 ? "" : "s")")
                        .font(.pbCaption)
                        .foregroundStyle(.white.opacity(0.5))

                    if !children.isEmpty {
                        Text("·")
                            .foregroundStyle(.white.opacity(0.3))
                        Text("\(children.count) sub\(children.count == 1 ? "category" : "categories")")
                            .font(.pbCaption)
                            .foregroundStyle(.white.opacity(0.5))
                    }
                }
            }

            Spacer()

            // Mini preview stack
            if !previewPlays.isEmpty {
                HStack(spacing: -12) {
                    ForEach(previewPlays.prefix(3)) { play in
                        RoundedRectangle(cornerRadius: 6)
                            .fill(category.accentColor.opacity(0.25))
                            .frame(width: 36, height: 52)
                            .overlay(
                                Image(systemName: "play.fill")
                                    .font(.system(size: 10))
                                    .foregroundStyle(category.accentColor.opacity(0.7))
                            )
                            .clipShape(RoundedRectangle(cornerRadius: 6))
                    }
                }
            }

            Image(systemName: "chevron.right")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(.white.opacity(0.3))
        }
        .padding(Spacing.md)
        .background(Color.pbCard)
        .clipShape(RoundedRectangle(cornerRadius: Radius.md))
    }
}

// MARK: - Category detail

struct CategoryDetailView: View {
    let category: Category
    let vm: PlaybookViewModel
    @State private var selectedPlay: Play?

    private let columns = [
        GridItem(.flexible(), spacing: Spacing.sm),
        GridItem(.flexible(), spacing: Spacing.sm),
        GridItem(.flexible(), spacing: Spacing.sm),
    ]

    var directReadyPlays: [Play] {
        vm.plays.filter { $0.categoryId == category.id && $0.status == .ready }
            .sorted { $0.createdAt > $1.createdAt }
    }

    var childCategories: [Category] { vm.children(of: category) }

    var body: some View {
        ZStack {
            Color.pbBg.ignoresSafeArea()
            ScrollView {
                VStack(alignment: .leading, spacing: Spacing.lg) {
                    // Sub-categories
                    if !childCategories.isEmpty {
                        VStack(alignment: .leading, spacing: Spacing.sm) {
                            sectionHeader("Categories")
                            ForEach(childCategories) { child in
                                NavigationLink {
                                    CategoryDetailView(category: child, vm: vm)
                                } label: {
                                    subCategoryRow(child)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }

                    // Direct clips
                    if !directReadyPlays.isEmpty {
                        VStack(alignment: .leading, spacing: Spacing.sm) {
                            HStack {
                                sectionHeader("Clips")
                                Spacer()
                                // Watch all button
                                Button {
                                    selectedPlay = directReadyPlays.first
                                } label: {
                                    Label("Watch all", systemImage: "play.fill")
                                        .font(.pbCallout)
                                        .foregroundStyle(category.accentColor)
                                }
                            }
                            .padding(.horizontal, Spacing.md)

                            LazyVGrid(columns: columns, spacing: Spacing.sm) {
                                ForEach(directReadyPlays) { play in
                                    Button { selectedPlay = play } label: {
                                        PlayCard(play: play)
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                            .padding(.horizontal, Spacing.md)
                        }
                    }

                    if directReadyPlays.isEmpty && childCategories.isEmpty {
                        emptyState
                    }
                }
                .padding(.vertical, Spacing.md)
            }
        }
        .navigationTitle(category.name)
        .navigationBarTitleDisplayMode(.large)
        .toolbarBackground(Color.pbBg, for: .navigationBar)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .sheet(item: $selectedPlay) { play in
            PlayReelView(plays: directReadyPlays, startingAt: play)
        }
    }

    private func sectionHeader(_ title: String) -> some View {
        Text(title)
            .font(.pbHeadline)
            .foregroundStyle(.white.opacity(0.55))
            .padding(.horizontal, Spacing.md)
    }

    private func subCategoryRow(_ child: Category) -> some View {
        HStack {
            Circle()
                .fill(child.accentColor)
                .frame(width: 8, height: 8)
            Text(child.name)
                .font(.pbHeadline)
                .foregroundStyle(.white)
            Spacer()
            Text("\(vm.playCount(for: child))")
                .font(.pbCaption)
                .foregroundStyle(.white.opacity(0.4))
            Image(systemName: "chevron.right")
                .font(.system(size: 12))
                .foregroundStyle(.white.opacity(0.3))
        }
        .padding(.horizontal, Spacing.md)
        .padding(.vertical, 14)
        .background(Color.pbCard)
        .clipShape(RoundedRectangle(cornerRadius: Radius.md))
        .padding(.horizontal, Spacing.md)
    }

    private var emptyState: some View {
        VStack(spacing: Spacing.sm) {
            Image(systemName: "tray")
                .font(.system(size: 36))
                .foregroundStyle(category.accentColor.opacity(0.5))
            Text("No clips in \(category.name) yet")
                .font(.pbCallout)
                .foregroundStyle(.white.opacity(0.45))
        }
        .frame(maxWidth: .infinity)
        .padding(.top, Spacing.xxl)
    }
}
